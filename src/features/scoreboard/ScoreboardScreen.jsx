import { useState } from 'react';
import { useWeekSelector } from '@/shared/hooks/useWeekSelector.js';
import { Centered } from '@/shared/components/Centered.jsx';
import { WeekSelect } from '@/shared/components/WeekSelect.jsx';
import { SubTabs } from '@/shared/components/SubTabs.jsx';
import { useStandings } from './hooks/useStandings.js';
import { StandingsTable } from './components/StandingsTable.jsx';

const VIEWS = [{ id: 'weekly', label: 'Weekly' }, { id: 'overall', label: 'Overall' }];

export function ScoreboardScreen() {
  const { week, setWeek, weeks } = useWeekSelector(1);
  const [view, setView] = useState('weekly');
  const { weeklyRecords, overallRecords, priorRanks, loading } = useStandings(week);

  return (
    <div className="pad">
      <div className="panel">
        <h2>Scoreboard</h2>
        <WeekSelect week={week} weeks={weeks} onChange={setWeek} />
        <SubTabs options={VIEWS} value={view} onChange={setView} />
        {loading ? <Centered>Loading…</Centered> : view === 'weekly'
          ? <StandingsTable records={weeklyRecords} />
          : <StandingsTable records={overallRecords} priorRanks={priorRanks} />}
      </div>
    </div>
  );
}
