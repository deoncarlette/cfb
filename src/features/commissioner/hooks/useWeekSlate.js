import { useCallback, useEffect, useState } from 'react';
import { lockInfo } from '@/features/picks/picksLogic.js';
import { fetchGamesFor, applyRankOverlay, isDefaultSlateGame, POSTSEASON } from '@/services/espn/index.js';
import { getWeekConfig, saveWeekConfig } from '@/services/data/index.js';
import { toDatetimeLocal } from '@/shared/utils/dates.js';
import { weekLabel } from '@/shared/components/WeekSelect.jsx';
import { samplePicksForWeek } from '@/features/picks/sample/samplePicks.js';

// The settings Save would write, as a comparable string (the deadline only counts when the whole
// slate locks at once).
const slateKey = (ids, lockMode, deadline) =>
  JSON.stringify([[...ids].map(String).sort(), lockMode, lockMode === 'slate' ? deadline || '' : '']);

// Commissioner's weekly setup: pull games, choose which count, set when picks lock.
export function useWeekSlate(week) {
  const [games, setGames] = useState([]);
  const [includedIds, setIncludedIds] = useState(new Set());
  const [deadline, setDeadline] = useState('');
  const [lockMode, setLockMode] = useState('slate'); // 'slate' (all at once) | 'kickoff' (each game)
  const [status, setStatus] = useState('');
  const [pulling, setPulling] = useState(false);
  const [saving, setSaving] = useState(false);
  // What's saved for this week, in the same shape as slateKey() — null when nothing is saved
  // yet (then Save stays on, since the starting selection isn't stored anywhere).
  const [savedKey, setSavedKey] = useState(null);
  const [savedCfg, setSavedCfg] = useState(null); // the settings players see (null = none saved)

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
      setSavedCfg(cfg.includedGameIds ? cfg : null);
      setSavedKey(cfg.includedGameIds
        ? slateKey(cfg.includedGameIds, cfg.lockMode === 'kickoff' ? 'kickoff' : 'slate', toDatetimeLocal(cfg.deadlineIso))
        : null);
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
    setSavedKey(slateKey(includedGameIds || [], lockMode, deadline));
    setSavedCfg({ includedGameIds, deadlineIso, lockMode });
    setStatus(`Saved. ${weekLabel(week)} now uses ${includedGameIds ? includedGameIds.length : 'all'} game(s).`);
    setSaving(false);
  }

  const dirty = savedKey !== slateKey([...includedIds], lockMode, deadline);
  // Once the week starts locking (by the SAVED settings — what players see; with none saved,
  // the default: first kickoff of the selected games), its settings are frozen too.
  const savedIds = new Set((savedCfg?.includedGameIds || [...includedIds]).map(String));
  const lock = lockInfo(savedCfg || { lockMode: 'slate', deadlineIso: null }, games.filter(g => savedIds.has(g.id)));
  return { games, includedIds, deadline, setDeadline, lockMode, setLockMode, status, pulling, saving, dirty, lock, pullGames, toggle, selectAll, deselectAll, save };
}
