import { useEffect, useRef, useState } from 'react';
import { fetchCurrentWeek } from '@/services/espn/index.js';

const WEEKS = Array.from({ length: 16 }, (_, i) => i); // 0..15

// Asked once per page load and shared by every tab.
let currentWeek = null;
let currentWeekPromise = null;

// Week dropdown state. Starts on ESPN's current week (falls back to `initial`); once someone
// picks a week themselves, it stays there — across tabs and through a page reload.
// currentWeek is null until ESPN answers.
const SAVED_KEY = 'bb-week';
function savedWeek() {
  try { const v = sessionStorage.getItem(SAVED_KEY); return v != null ? Number(v) : null; } catch (e) { return null; }
}

export function useWeekSelector(initial = 1) {
  const [week, setWeekState] = useState(() => savedWeek() ?? currentWeek ?? initial);
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
  }
  return { week, setWeek, weeks: WEEKS, currentWeek: current };
}
