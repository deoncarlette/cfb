import { useCallback, useEffect, useState } from 'react';
import { fetchGamesFor, applyRankOverlay, isDefaultSlateGame, POSTSEASON } from '@/services/espn/index.js';
import { getWeekConfig, saveWeekConfig } from '@/services/data/index.js';
import { toDatetimeLocal } from '@/shared/utils/dates.js';
import { weekLabel } from '@/shared/components/WeekSelect.jsx';
import { samplePicksForWeek } from '@/features/picks/sample/samplePicks.js';

// Commissioner's weekly setup: pull games, choose which count, set when picks lock.
export function useWeekSlate(week) {
  const [games, setGames] = useState([]);
  const [includedIds, setIncludedIds] = useState(new Set());
  const [deadline, setDeadline] = useState('');
  const [lockMode, setLockMode] = useState('slate'); // 'slate' (all at once) | 'kickoff' (each game)
  const [status, setStatus] = useState('');
  const [pulling, setPulling] = useState(false);
  const [saving, setSaving] = useState(false);

  const pullGames = useCallback(async () => {
    setPulling(true);
    setStatus(`Pulling ${weekLabel(week)} from ESPN…`);
    try {
      let pulled = await fetchGamesFor(week, [80, 81]); // 80 = FBS, 81 = FCS — "all D1"; bowls for Postseason
      pulled = await applyRankOverlay(pulled, week);
      setGames(pulled);
      const cfg = await getWeekConfig(week);
      // Nothing saved yet for this week → start with the same games the Picks tab shows: the
      // sample file's games for weeks it covers, else the default slate (Top 25, Howard, SEC,
      // Big Ten), or every bowl for Postseason.
      const sample = cfg.includedGameIds ? null : await samplePicksForWeek(week, pulled);
      setIncludedIds(new Set(cfg.includedGameIds || sample?.gameIds || (week === POSTSEASON ? pulled : pulled.filter(isDefaultSlateGame)).map(g => g.id)));
      setDeadline(toDatetimeLocal(cfg.deadlineIso));
      setLockMode(cfg.lockMode === 'kickoff' ? 'kickoff' : 'slate');
      setStatus(`${pulled.length} games pulled for ${weekLabel(week)}.`);
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
    const deadlineIso = lockMode === 'slate' && deadline ? new Date(deadline).toISOString() : null;
    await saveWeekConfig(week, includedGameIds, deadlineIso, lockMode);
    setStatus(`Saved. ${weekLabel(week)} now uses ${includedGameIds ? includedGameIds.length : 'all'} game(s).`);
    setSaving(false);
  }

  return { games, includedIds, deadline, setDeadline, lockMode, setLockMode, status, pulling, saving, pullGames, toggle, selectAll, deselectAll, save };
}
