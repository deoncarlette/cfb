import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchEspnGames, applyRankOverlay } from '@/services/espn/index.js';
import { getWeekConfig } from '@/services/data/index.js';
import { gamesForWeek, isDeadlinePassed } from '../picksLogic.js';

// Loads one week's games (from ESPN) and settings (from the commissioner).
export function usePicksWeek(week) {
  const [games, setGames] = useState([]);
  const [config, setConfig] = useState({ includedGameIds: null, deadlineIso: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [fetched, cfg] = await Promise.all([
        fetchEspnGames(week, [80]).then(gs => applyRankOverlay(gs, week)),
        getWeekConfig(week)
      ]);
      setConfig(cfg);
      setGames(gamesForWeek(fetched, cfg));
    } catch (e) {
      setError("Couldn't reach ESPN. Try again in a moment.");
      setGames([]);
    }
    setLoading(false);
  }, [week]);

  useEffect(() => { load(); }, [load]);

  const deadlinePassed = useMemo(() => isDeadlinePassed(config, games), [config, games]);
  return { games, config, loading, error, deadlinePassed };
}
