import { useCallback, useEffect, useState } from 'react';
import { fetchEspnGames, applyRankOverlay, gameCategory } from '@/services/espn/index.js';
import { getWeekConfig, saveWeekConfig } from '@/services/data/index.js';
import { toDatetimeLocal } from '@/shared/utils/dates.js';

// Commissioner's weekly setup: pull games, choose which count, set when picks lock.
export function useWeekSlate(week) {
  const [games, setGames] = useState([]);
  const [includedIds, setIncludedIds] = useState(new Set());
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState('');
  const [pulling, setPulling] = useState(false);
  const [saving, setSaving] = useState(false);

  const pullGames = useCallback(async () => {
    setPulling(true);
    setStatus(`Pulling Week ${week} from ESPN…`);
    try {
      let pulled = await fetchEspnGames(week, [80, 81]); // 80 = FBS, 81 = FCS — "all D1"
      pulled = await applyRankOverlay(pulled, week);
      setGames(pulled);
      const cfg = await getWeekConfig(week);
      // Nothing saved yet for this week → start with just the Top 25 games checked.
      setIncludedIds(new Set(cfg.includedGameIds ? cfg.includedGameIds : pulled.filter(g => gameCategory(g) === 'top25').map(g => g.id)));
      setDeadline(toDatetimeLocal(cfg.deadlineIso));
      setStatus(`${pulled.length} games pulled for Week ${week}.`);
    } catch (e) {
      setGames([]);
      setStatus("Couldn't reach ESPN. Try again in a moment.");
    }
    setPulling(false);
  }, [week]);

  useEffect(() => { pullGames(); }, [pullGames]);

  function toggle(id) {
    setIncludedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function selectAll(ids) { setIncludedIds(prev => new Set([...prev, ...ids])); }
  function deselectAll(ids) { setIncludedIds(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; }); }

  async function save() {
    setSaving(true);
    const includedGameIds = games.length ? Array.from(includedIds) : null;
    const deadlineIso = deadline ? new Date(deadline).toISOString() : null;
    await saveWeekConfig(week, includedGameIds, deadlineIso);
    setStatus(`Saved. Week ${week}'s Entry card now uses ${includedGameIds ? includedGameIds.length : 'all'} game(s).`);
    setSaving(false);
  }

  return { games, includedIds, deadline, setDeadline, status, pulling, saving, pullGames, toggle, selectAll, deselectAll, save };
}
