import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { REPLAY_WEEK } from '@/config.js';
import { fetchEspnGames, applyRankOverlay } from '@/services/espn/index.js';
import { replayGames, loadReplaySummaries } from '@/services/espn/replay.js';
import { getWeekConfig } from '@/services/data/index.js';
import { gamesForWeek, isDeadlinePassed } from '../picksLogic.js';
import { samplePicksForWeek, firstSampleWeek } from '../sample/samplePicks.js';

const REFRESH_MS = 30 * 1000;
const SOON_MS = 15 * 60 * 1000;

async function fetchWeekGames(week) {
  const games = await fetchEspnGames(week, [80, 81]).then(gs => applyRankOverlay(gs, week)); // FCS too, for Howard
  if (week !== REPLAY_WEEK) return games;
  await loadReplaySummaries(games); // real box scores, so replayed scores match ESPN's plays
  return replayGames(games);
}

// While a game is live or kicks off within 15 minutes, scores need refreshing.
function needsRefresh(games) {
  const now = Date.now();
  return games.some(g => g.state === 'in' || (!g.completed && new Date(g.date).getTime() - now < SOON_MS));
}

// Loads one week: games from ESPN, the commissioner's settings, and — if the commissioner
// hasn't set the slate — the sample picks for that week, whose games become the slate.
// No sample picks: Week 0 is empty; later weeks use the default slate (Top 25, Howard, SEC, Big Ten).
// While games are live, scores refresh every 30 seconds (and when you come back to the tab).
export function usePicksWeek(week) {
  const [games, setGames] = useState([]);
  const [config, setConfig] = useState({ includedGameIds: null, deadlineIso: null });
  const [sample, setSample] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const gamesRef = useRef(games);
  gamesRef.current = games;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [fetched, cfg] = await Promise.all([fetchWeekGames(week), getWeekConfig(week)]);
      const sp = cfg.includedGameIds ? null : await samplePicksForWeek(week, fetched);
      // Weeks before the sample file starts (Week 0) have no slate unless the commissioner sets one.
      const beforeSample = !cfg.includedGameIds && week < await firstSampleWeek();
      setConfig(cfg);
      setSample(sp);
      setGames(sp ? fetched.filter(g => sp.gameIds.includes(g.id)) : beforeSample ? [] : gamesForWeek(fetched, cfg));
      setUpdatedAt(new Date());
    } catch (e) {
      setError("Couldn't reach ESPN. Try again in a moment.");
      setSample(null);
      setGames([]);
    }
    setLoading(false);
  }, [week]);

  // Scores/clock only — same games, so nothing on screen (like unsaved picks) resets.
  const refresh = useCallback(async () => {
    try {
      const fresh = await fetchWeekGames(week);
      const byId = new Map(fresh.map(g => [g.id, g]));
      setGames(prev => prev.map(g => byId.get(g.id) || g));
      setUpdatedAt(new Date());
    } catch (e) { /* keep showing the last scores; try again next tick */ }
  }, [week]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const tick = () => { if (!document.hidden && needsRefresh(gamesRef.current)) refresh(); };
    const id = setInterval(tick, REFRESH_MS);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [refresh]);

  const deadlinePassed = useMemo(() => isDeadlinePassed(config, games), [config, games]);
  const anyLive = games.some(g => g.state === 'in');
  return { games, config, sample, loading, error, deadlinePassed, anyLive, updatedAt, isReplay: week === REPLAY_WEEK };
}
