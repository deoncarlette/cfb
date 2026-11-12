import { useEffect, useState } from 'react';
import { recordsForWeek, computeOverallStandings, rankMap } from '../scoring.js';
import { useWeekSelector } from '../hooks/useWeekSelector.js';
import { Centered } from '../components/Centered.jsx';
import { StandingsTable } from '../components/StandingsTable.jsx';

export function ScoreboardScreen() {
  const { week, setWeek, weeks } = useWeekSelector(1);
  const [view, setView] = useState('weekly');
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

  return (
    <div className="pad">
      <div className="panel">
        <h2>Scoreboard</h2>
        <select value={week} onChange={e => setWeek(Number(e.target.value))}>
          {weeks.map(w => <option key={w} value={w}>Week {w}</option>)}
        </select>
        <div className="subtab-track">
          <button className={'subtab-btn' + (view === 'weekly' ? ' active' : '')} onClick={() => setView('weekly')}>Weekly</button>
          <button className={'subtab-btn' + (view === 'overall' ? ' active' : '')} onClick={() => setView('overall')}>Overall</button>
        </div>
        {loading ? <Centered>Loading…</Centered> : view === 'weekly'
          ? <StandingsTable records={weeklyRecords} />
          : <StandingsTable records={overallRecords} priorRanks={priorRanks} />}
      </div>
    </div>
  );
}
