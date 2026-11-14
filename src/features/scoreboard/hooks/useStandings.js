import { useEffect, useState } from 'react';
import { recordsForWeek, computeOverallStandings, rankMap, replayProgress, isLiveScoredWeek } from '../scoring.js';

const REFRESH_MS = 30 * 1000;

// Weekly + season-to-date standings for a week, plus last week's ranks for the ▲/▼ arrows.
// On or after the test replay week, it re-scores every 30 seconds so points come in as
// replayed games finish.
export function useStandings(week) {
  const [weeklyRecords, setWeeklyRecords] = useState([]);
  const [overallRecords, setOverallRecords] = useState([]);
  const [priorRanks, setPriorRanks] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function load() {
      const weekly = await recordsForWeek(week);
      const overall = await computeOverallStandings(week);
      const priorOverall = week > 0 ? await computeOverallStandings(week - 1) : null;
      const prog = await replayProgress(week).catch(() => null);
      if (cancelled) return;
      setWeeklyRecords(weekly);
      setOverallRecords(overall);
      setPriorRanks(priorOverall ? rankMap(priorOverall) : null);
      setProgress(prog);
      setLoading(false);
    }
    load();
    // Keep refreshing while this week or any week in the overall total is scored live.
    const live = Array.from({ length: week + 1 }, (_, w) => w).some(isLiveScoredWeek);
    const id = live ? setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS) : null;
    return () => { cancelled = true; if (id) clearInterval(id); };
  }, [week]);

  return { weeklyRecords, overallRecords, priorRanks, progress, loading };
}
