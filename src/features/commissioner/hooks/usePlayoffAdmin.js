import { useEffect, useMemo, useState } from 'react';
import { SEASON } from '@/config.js';
import { fetchCurrentRankings } from '@/services/espn/index.js';
import { getPlayoffConfig, savePlayoffConfig, getAllBrackets } from '@/services/data/index.js';
import { GAMES, seedMap, setPick, pruneInvalidPicks } from '@/features/bracket/bracketLogic.js';
import { toDatetimeLocal } from '@/shared/utils/dates.js';
import { syncPlayoffResults } from '../syncPlayoffResults.js';

export const SEED_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

// Commissioner's playoff setup: the 12 seeds, lock time, and results as games finish.
export function usePlayoffAdmin() {
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

  // Tap a winner to record it; tap the same winner again to undo.
  function markResult(gameKey, teamId) {
    setResults(prev => prev[gameKey] === teamId
      ? pruneInvalidPicks(Object.fromEntries(Object.entries(prev).filter(([k]) => k !== gameKey)), bySeed)
      : setPick(prev, gameKey, teamId, bySeed));
  }

  async function syncFromEspn() {
    setBusy(true); setStatus('Checking ESPN…');
    try {
      const synced = await syncPlayoffResults(results, bySeed, titleTotal);
      setResults(synced.results); setTitleTotal(synced.championshipTotal);
      setStatus(`${Object.keys(synced.results).length} of ${GAMES.length} games decided. Save to publish.`);
    } catch (e) {
      setStatus("Couldn't reach ESPN's postseason scoreboard.");
    }
    setBusy(false);
  }

  async function save() {
    setBusy(true);
    const toSave = fieldComplete ? seeds.map(({ seed, id, name, abbr, logo, color, altColor, record }) => ({ seed, id, name, abbr, logo, color, altColor: altColor ?? null, record })) : [];
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

  return {
    candidates, pollName, seedIds, seeds, fieldComplete, seedsChanged, entryCount,
    lock, setLock, results, titleTotal, setTitleTotal, status, busy,
    fillFromRankings, assignSeed, markResult, syncFromEspn, save
  };
}
