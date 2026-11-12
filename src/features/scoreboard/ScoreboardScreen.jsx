import { useState } from 'react';
import { useWeekSelector } from '@/shared/hooks/useWeekSelector.js';
import { Centered } from '@/shared/components/Centered.jsx';
import { WeekSelect } from '@/shared/components/WeekSelect.jsx';
import { SubTabs } from '@/shared/components/SubTabs.jsx';
import { useStandings } from './hooks/useStandings.js';
import { weekInfo } from './scoring.js';
import { StandingsTable } from './components/StandingsTable.jsx';

const VIEWS = [{ id: 'weekly', label: 'Weekly' }, { id: 'overall', label: 'Overall' }];

export function ScoreboardScreen() {
  const { week, setWeek, weeks, currentWeek } = useWeekSelector(1);
  const [view, setView] = useState('weekly');
  const { weeklyRecords, overallRecords, priorRanks, loading } = useStandings(week);
  // Only weeks that have happened (through the current one).
  const shownWeeks = currentWeek == null ? weeks : weeks.filter(w => w <= currentWeek);
  const info = weekInfo(week);

  return (
    <div className="pad">
      <div className="panel">
        <h2>Scoreboard</h2>
        <WeekSelect week={week} weeks={shownWeeks} onChange={setWeek} />
        <SubTabs options={VIEWS} value={view} onChange={setView} />
        {info?.isSample && <p className="sample-note">Week {week} scores are sample data — these games aren't final yet.</p>}
        {view === 'weekly' && info?.possible && <p className="muted small">Out of {info.possible} possible points.</p>}
        {view === 'overall' && <p className="muted small">Season totals through Week {week}. Arrows show movement since Week {Math.max(0, week - 1)}.</p>}
        {loading ? <Centered>Loading…</Centered> : view === 'weekly'
          ? <StandingsTable records={weeklyRecords} />
          : <StandingsTable records={overallRecords} priorRanks={priorRanks} />}
      </div>
    </div>
  );
}
