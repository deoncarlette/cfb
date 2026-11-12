import { useEffect, useMemo, useState } from 'react';
import { SEASON, fetchCurrentRankings, formatKickoff } from '../espn.js';
import { getPlayoffConfig, getMyBracket, submitBracket, getAllBrackets } from '../firebase.js';
import {
  GAMES, ROUND_POINTS, MAX_POINTS, CHAMPIONSHIP_KEY, seedMap, setPick, isComplete,
  eliminatedTeams, pickStatus, rankBrackets
} from '../bracket.js';
import { BracketView } from '../components/BracketView.jsx';
import { Centered } from '../components/Centered.jsx';

// Before the commissioner saves real seeds (Selection Day), the bracket previews a straight
// 1-12 seeding from ESPN's current CFP rankings so people can play with it. Submitting is
// disabled until the real field is saved.
function projectedSeeds(teams) {
  return teams.slice(0, 12).map((t, i) => ({ ...t, seed: i + 1 }));
}

export function BracketScreen() {
  const [view, setView] = useState('mine');
  const [config, setConfig] = useState(null);
  const [seeds, setSeeds] = useState([]);
  const [projection, setProjection] = useState(null); // { pollName } when previewing
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [userName, setUserName] = useState('');
  const [picks, setPicks] = useState({});
  const [tiebreaker, setTiebreaker] = useState('');
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const [entries, setEntries] = useState([]);
  const [viewing, setViewing] = useState(null); // someone else's bracket, after lock

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const cfg = await getPlayoffConfig(SEASON);
        let field = cfg.seeds;
        let proj = null;
        if (field.length !== 12) {
          const ranked = await fetchCurrentRankings();
          if (ranked?.teams?.length >= 12) { field = projectedSeeds(ranked.teams); proj = { pollName: ranked.pollName }; }
          else field = [];
        }
        const all = await getAllBrackets(SEASON);
        if (cancelled) return;
        setConfig(cfg); setSeeds(field); setProjection(proj); setEntries(all);
      } catch (e) {
        if (!cancelled) setError("Couldn't load the bracket. Try again in a moment.");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const bySeed = useMemo(() => seedMap(seeds), [seeds]);
  const results = config?.results || {};
  const anyResults = Object.keys(results).length > 0;
  const locked = !projection && (
    anyResults || (config?.lockIso ? Date.now() >= new Date(config.lockIso).getTime() : false)
  );
  const eliminated = useMemo(() => eliminatedTeams(results, bySeed), [results, bySeed]);
  const statusFor = anyResults ? key => pickStatus(key, picks, results, eliminated) : null;

  function handlePick(gameKey, teamId) {
    setPicks(p => setPick(p, gameKey, teamId, bySeed));
    setSavedAt(null);
  }

  async function loadExisting() {
    if (!userName.trim() || projection) return;
    const mine = await getMyBracket(SEASON, userName);
    setExisting(mine);
    if (mine) { setPicks(mine.picks || {}); setTiebreaker(mine.tiebreaker ?? ''); }
  }

  async function handleSubmit() {
    setSaving(true);
    await submitBracket(SEASON, userName, picks, tiebreaker);
    setExisting({ picks, tiebreaker });
    setEntries(await getAllBrackets(SEASON));
    setSavedAt(Date.now());
    setSaving(false);
  }

  const pickedCount = GAMES.filter(g => picks[g.key]).length;
  const complete = isComplete(picks);
  const canSubmit = complete && userName.trim() && tiebreaker !== '' && !locked && !projection && !saving;

  if (loading) return <div className="pad"><Centered>Loading the bracket…</Centered></div>;
  if (error) return <div className="pad"><Centered>{error}</Centered></div>;

  return (
    <div className="bracket-page">
      <div className="pad bracket-pad">
        <div className="panel">
          <p className="section-label">College Football Playoff {SEASON}–{String(SEASON + 1).slice(2)}</p>
          <h2>Fill out your bracket</h2>
          <p className="muted small">
            Points double each round: {ROUND_POINTS.r1} / {ROUND_POINTS.qf} / {ROUND_POINTS.sf} / {ROUND_POINTS.nc}. Perfect bracket = {MAX_POINTS}.
            {' '}Tiebreaker is the title game's combined score.
          </p>
          <div className="subtab-track">
            <button className={'subtab-btn' + (view === 'mine' ? ' active' : '')} onClick={() => setView('mine')}>My bracket</button>
            <button className={'subtab-btn' + (view === 'standings' ? ' active' : '')} onClick={() => setView('standings')}>Standings</button>
          </div>

          {view === 'mine' && (
            <>
              {projection && (
                <p className="bk-notice">
                  Preview only — seeded straight from the current {projection.pollName}. The real field is set on Selection Day, and submissions open once the commissioner saves it.
                </p>
              )}
              {seeds.length === 12 && (
                <>
                  <label>Your name</label>
                  <input value={userName} onChange={e => setUserName(e.target.value)} onBlur={loadExisting} placeholder="Type your name" disabled={!!projection} />
                  <label>Tiebreaker — title game total points</label>
                  <input type="number" inputMode="numeric" min={0} value={tiebreaker} onChange={e => setTiebreaker(e.target.value)} placeholder="e.g. 51" disabled={locked} />
                  <p className="muted small">
                    {pickedCount} of {GAMES.length} games picked.
                    {config?.lockIso && <> Brackets lock {formatKickoff(config.lockIso)}{locked ? ' — locked' : ''}.</>}
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {view === 'mine' && seeds.length !== 12 && (
        <div className="pad"><Centered>The bracket shows up once rankings are out.</Centered></div>
      )}

      {view === 'mine' && seeds.length === 12 && (
        <>
          <div className="bracket-wrap">
            <BracketView seeds={seeds} winners={picks} onPick={handlePick} statusFor={statusFor} locked={locked} />
          </div>
          <div className="pad bracket-pad">
            <div className="row-gap">
              <button type="button" onClick={() => { setPicks({}); setSavedAt(null); }} disabled={locked || !pickedCount}>Clear</button>
              <button className="primary" disabled={!canSubmit} onClick={handleSubmit}>
                {saving ? 'Saving…' : existing ? 'Update bracket' : 'Submit bracket'}
              </button>
            </div>
            {!projection && !locked && !complete && <p className="muted small center">Pick every game to submit.</p>}
            {!projection && !locked && complete && tiebreaker === '' && <p className="muted small center">Add a tiebreaker to submit.</p>}
            {!projection && complete && !userName.trim() && <p className="muted small center">Enter your name to submit.</p>}
            {locked && <p className="muted small center">Brackets are locked.</p>}
            {savedAt && <p className="muted small center">Saved.</p>}
          </div>
        </>
      )}

      {view === 'standings' && (
        <div className="pad bracket-pad">
          <div className="panel">
            <BracketStandings entries={entries} results={results} bySeed={bySeed} seeds={seeds} locked={locked} championshipTotal={config?.championshipTotal ?? null} onOpen={setViewing} />
            {locked && entries.length > 0 && <p className="muted small">Tap a player to see their bracket.</p>}
          </div>
        </div>
      )}

      {view === 'standings' && viewing && (
        <>
          <div className="pad bracket-pad">
            <div className="section-heading">
              <span className="section-label">{viewing.user_name}'s bracket</span>
              <button className="link" onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
          <div className="bracket-wrap">
            <BracketView
              seeds={seeds}
              winners={viewing.picks || {}}
              statusFor={anyResults ? key => pickStatus(key, viewing.picks || {}, results, eliminated) : null}
              locked
            />
          </div>
        </>
      )}
    </div>
  );
}

function BracketStandings({ entries, results, bySeed, seeds, locked, championshipTotal, onOpen }) {
  if (!entries.length) return <p className="muted small">No brackets submitted yet.</p>;
  const teamById = Object.fromEntries(seeds.map(t => [t.id, t]));

  // Before lock, show who's in without exposing anyone's picks.
  if (!locked) {
    return (
      <table className="board">
        <thead><tr><th>Player</th><th></th></tr></thead>
        <tbody>
          {[...entries].sort((a, b) => a.user_name.localeCompare(b.user_name)).map(e => (
            <tr key={e.id}><td>{e.user_name}</td><td className="num">Submitted</td></tr>
          ))}
        </tbody>
      </table>
    );
  }

  const rows = rankBrackets(entries, results, bySeed, championshipTotal);
  return (
    <table className="board">
      <thead><tr><th>Player</th><th>Champ</th><th className="num-h">Max</th><th className="num-h">Pts</th></tr></thead>
      <tbody>
        {rows.map((r, i) => {
          const champ = teamById[r.picks?.[CHAMPIONSHIP_KEY]];
          return (
            <tr key={r.id} className="clickable" onClick={() => onOpen(r)}>
              <td>{i + 1}. {r.user_name}</td>
              <td className="bk-champ-cell">
                {champ && (
                  <span className="team-logo-swatch" style={{ '--swatch-color': champ.color }} title={champ.name}>
                    {champ.logo && <img src={champ.logo} alt={champ.name} />}
                  </span>
                )}
              </td>
              <td className="num muted-num">{r.possible}</td>
              <td className="num">{r.score}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
