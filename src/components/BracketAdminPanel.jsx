import { useEffect, useMemo, useState } from 'react';
import { SEASON, fetchCurrentRankings, fetchPlayoffResults } from '../espn.js';
import { getPlayoffConfig, savePlayoffConfig, getAllBrackets } from '../firebase.js';
import { GAMES, seedMap, participants, setPick, pruneInvalidPicks } from '../bracket.js';
import { BracketView } from './BracketView.jsx';

const SEED_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Commissioner tools for the CFP bracket: set the 12 seeds on Selection Day, set when brackets
// lock, and record winners as games finish (tap, or pull from ESPN).
export function BracketAdminPanel() {
  const [candidates, setCandidates] = useState([]); // ranked teams to choose seeds from
  const [pollName, setPollName] = useState('');
  const [seedIds, setSeedIds] = useState({}); // { seedNumber: teamId }
  const [savedSeeds, setSavedSeeds] = useState([]);
  const [lock, setLock] = useState('');
  const [results, setResults] = useState({});
  const [titleTotal, setTitleTotal] = useState('');
  const [entryCount, setEntryCount] = useState(0);
  const [status, setStatus] = useState('Loading…');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [cfg, ranked, brackets] = await Promise.all([
        getPlayoffConfig(SEASON), fetchCurrentRankings(), getAllBrackets(SEASON).catch(() => [])
      ]);
      const pool = [...(ranked?.teams || [])];
      cfg.seeds.forEach(t => { if (!pool.some(p => p.id === t.id)) pool.push(t); });
      setCandidates(pool);
      setPollName(ranked?.pollName || '');
      setSavedSeeds(cfg.seeds);
      setSeedIds(Object.fromEntries(cfg.seeds.map(t => [t.seed, t.id])));
      setLock(toDatetimeLocal(cfg.lockIso));
      setResults(cfg.results);
      setTitleTotal(cfg.championshipTotal ?? '');
      setEntryCount(brackets.length);
      setStatus(cfg.seeds.length === 12 ? 'Field is set.' : 'No field saved yet.');
    })().catch(() => setStatus("Couldn't load playoff settings."));
  }, []);

  const teamById = useMemo(() => Object.fromEntries(candidates.map(t => [t.id, t])), [candidates]);
  const seeds = SEED_NUMBERS.filter(n => seedIds[n] && teamById[seedIds[n]])
    .map(n => ({ ...teamById[seedIds[n]], seed: n }));
  const fieldComplete = seeds.length === 12;
  const bySeed = seedMap(seeds);
  const seedsChanged = JSON.stringify(savedSeeds.map(t => [t.seed, t.id])) !== JSON.stringify(seeds.map(t => [t.seed, t.id]));

  function fillFromRankings() {
    setSeedIds(Object.fromEntries(candidates.slice(0, 12).map((t, i) => [i + 1, t.id])));
    setResults({});
  }

  // Picking a team already seeded elsewhere swaps the two, so there are never duplicates.
  function assignSeed(seed, teamId) {
    setSeedIds(prev => {
      const next = { ...prev };
      const other = SEED_NUMBERS.find(n => n !== seed && next[n] === teamId);
      if (other) next[other] = prev[seed];
      next[seed] = teamId || undefined;
      return next;
    });
    setResults({});
  }

  function markResult(gameKey, teamId) {
    setResults(prev => prev[gameKey] === teamId
      ? pruneInvalidPicks(Object.fromEntries(Object.entries(prev).filter(([k]) => k !== gameKey)), bySeed)
      : setPick(prev, gameKey, teamId, bySeed));
  }

  async function syncFromEspn() {
    setBusy(true); setStatus('Checking ESPN…');
    try {
      // Walk round by round so a newly found QF result can unlock its semifinal lookup.
      let next = { ...results }; let total = titleTotal;
      for (let pass = 0; pass < 4; pass++) {
        const matchups = GAMES.map(g => ({ key: g.key, teams: participants(g.key, bySeed, next) }))
          .filter(m => m.teams.every(Boolean) && !next[m.key]);
        if (!matchups.length) break;
        const found = await fetchPlayoffResults(matchups);
        if (!Object.keys(found.results).length) break;
        next = pruneInvalidPicks({ ...next, ...found.results }, bySeed);
        if (found.championshipTotal != null) total = found.championshipTotal;
      }
      setResults(next); setTitleTotal(total);
      setStatus(`${Object.keys(next).length} of ${GAMES.length} games decided. Save to publish.`);
    } catch (e) {
      setStatus("Couldn't reach ESPN's postseason scoreboard.");
    }
    setBusy(false);
  }

  async function handleSave() {
    setBusy(true);
    const toSave = fieldComplete ? seeds.map(({ seed, id, name, abbr, logo, color, record }) => ({ seed, id, name, abbr, logo, color, record })) : [];
    await savePlayoffConfig(SEASON, {
      seeds: toSave,
      lockIso: lock ? new Date(lock).toISOString() : null,
      results: fieldComplete ? results : {},
      championshipTotal: titleTotal === '' ? null : Number(titleTotal)
    });
    setSavedSeeds(toSave);
    setStatus('Saved. The Bracket tab is up to date.');
    setBusy(false);
  }

  return (
    <div className="panel">
      <p className="section-label">Playoff bracket</p>
      <h2>Seed the field</h2>
      <p className="muted small">
        Set all 12 seeds after Selection Day (top 4 get byes, no re-seeding). Until then the Bracket tab shows a preview from the current {pollName || 'rankings'} and submissions stay closed.
      </p>

      <div className="row-gap">
        <button onClick={fillFromRankings} disabled={!candidates.length}>Fill 1–12 from {pollName || 'rankings'}</button>
      </div>
      <p className="muted small">Then adjust for the five conference-champion auto-bids — picking a team that's already seeded swaps the two.</p>

      <div className="seed-grid">
        {SEED_NUMBERS.map(n => (
          <div key={n} className="seed-row">
            <span className="seed-num">{n}</span>
            <select value={seedIds[n] || ''} onChange={e => assignSeed(n, e.target.value)}>
              <option value="">—</option>
              {candidates.map(t => <option key={t.id} value={t.id}>{t.rank ? `#${t.rank} ` : ''}{t.name}</option>)}
            </select>
          </div>
        ))}
      </div>
      {seedsChanged && entryCount > 0 && (
        <p className="bk-notice">{entryCount} bracket(s) were submitted against the saved field. Changing seeds now can invalidate their picks.</p>
      )}

      <label>Brackets lock at</label>
      <input type="datetime-local" value={lock} onChange={e => setLock(e.target.value)} />
      <p className="muted small">Set this to the first first-round kickoff. Brackets also lock as soon as any result is recorded.</p>

      {fieldComplete && (
        <>
          <div className="section-heading">
            <span className="section-label">Results</span>
            <button onClick={syncFromEspn} disabled={busy}>Pull results from ESPN</button>
          </div>
          <p className="muted small">Tap the winner of each finished game (tap again to undo).</p>
        </>
      )}
      <span className="muted small">{status}</span>

      {fieldComplete && (
        <>
          <div className="bracket-wrap in-panel">
            <BracketView seeds={seeds} winners={results} onPick={markResult} />
          </div>
          <label>Title game total points (tiebreaker)</label>
          <input type="number" inputMode="numeric" value={titleTotal} onChange={e => setTitleTotal(e.target.value)} placeholder="Filled in after the title game" />
        </>
      )}

      <button className="primary big" onClick={handleSave} disabled={busy}>{busy ? 'Working…' : 'Save playoff settings'}</button>
    </div>
  );
}
