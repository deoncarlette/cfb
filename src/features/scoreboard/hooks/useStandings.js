import { useEffect, useState } from 'react';
import { recordsForWeek, computeOverallStandings, rankMap } from '../scoring.js';

// Weekly + season-to-date standings for a week, plus last week's ranks for the ▲/▼ arrows.
export function useStandings(week) {
  const [weeklyRecords, setWeeklyRecords] = useState([]);
  const [overallRecords, setOverallRecords] = useState([]);
  const [priorRanks, setPriorRanks] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const weekly = await recordsForWeek(week);
      const overall = await computeOverallStandings(week);
      const priorOverall = week > 0 ? await computeOverallStandings(week - 1) : null;
      if (cancelled) return;
      setWeeklyRecords(weekly);
      setOverallRecords(overall);
      setPriorRanks(priorOverall ? rankMap(priorOverall) : null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [week]);

  return { weeklyRecords, overallRecords, priorRanks, loading };
}
