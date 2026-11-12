import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchEspnGames, applyRankOverlay } from '@/services/espn/index.js';
import { getWeekConfig } from '@/services/data/index.js';
import { gamesForWeek, isDeadlinePassed } from '../picksLogic.js';
import { samplePicksForWeek } from '../sample/samplePicks.js';

// Loads one week: games from ESPN, the commissioner's settings, and — if the commissioner
// hasn't set the slate — the sample picks for that week, whose games become the slate.
export function usePicksWeek(week) {
  const [games, setGames] = useState([]);
  const [config, setConfig] = useState({ includedGameIds: null, deadlineIso: null });
  const [sample, setSample] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [fetched, cfg] = await Promise.all([
        fetchEspnGames(week, [80, 81]).then(gs => applyRankOverlay(gs, week)), // FCS too, for Howard
        getWeekConfig(week)
      ]);
      const sp = cfg.includedGameIds ? null : await samplePicksForWeek(week, fetched);
      setConfig(cfg);
      setSample(sp);
      setGames(sp ? fetched.filter(g => sp.gameIds.includes(g.id)) : gamesForWeek(fetched, cfg));
    } catch (e) {
      setError("Couldn't reach ESPN. Try again in a moment.");
      setSample(null);
      setGames([]);
    }
    setLoading(false);
  }, [week]);

  useEffect(() => { load(); }, [load]);

  const deadlinePassed = useMemo(() => isDeadlinePassed(config, games), [config, games]);
  return { games, config, sample, loading, error, deadlinePassed };
}
