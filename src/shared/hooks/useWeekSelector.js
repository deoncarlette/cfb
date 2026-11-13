import { useEffect, useRef, useState } from 'react';
import { fetchCurrentWeek, POSTSEASON } from '@/services/espn/index.js';
import { useNav, navigate } from '@/shared/nav.js';

const WEEKS = [...Array.from({ length: 16 }, (_, i) => i), POSTSEASON]; // 0..15, then Postseason

// Asked once per page load and shared by every tab.
let currentWeek = null;
let currentWeekPromise = null;

// Week dropdown state. The week in the address wins (#picks?week=10, so Back works); otherwise
// ESPN's current week (falls back to `initial`); once someone picks a week themselves, it stays
// there — across tabs and through a page reload.
// currentWeek is null until ESPN answers.
const SAVED_KEY = 'bb-week';
function savedWeek() {
  try { const v = sessionStorage.getItem(SAVED_KEY); return v == null ? null : v === POSTSEASON ? POSTSEASON : Number(v); } catch (e) { return null; }
}

export function useWeekSelector(initial = 1) {
  const nav = useNav();
  const [fallback, setWeekState] = useState(() => savedWeek() ?? currentWeek ?? initial);
  const week = nav.week != null && WEEKS.includes(nav.week) ? nav.week : fallback;
  const [current, setCurrent] = useState(currentWeek);
  const touched = useRef(savedWeek() != null); // a week picked earlier in this tab survives a reload

  useEffect(() => {
    if (!currentWeekPromise) currentWeekPromise = fetchCurrentWeek().then(w => { currentWeek = w; return w; });
    let alive = true;
    currentWeekPromise.then(w => { if (!alive) return; setCurrent(w); if (w != null && !touched.current) setWeekState(w); });
    return () => { alive = false; };
  }, []);

  function setWeek(w) {
    touched.current = true;
    setWeekState(w);
    try { sessionStorage.setItem(SAVED_KEY, String(w)); } catch (e) {}
    if (w === week) return;
    if (nav.week == null) navigate({ week }, { replace: true }); // so Back returns to the week you left
    navigate({ week: w, player: '' });
  }
  return { week, setWeek, weeks: WEEKS, currentWeek: current };
}
