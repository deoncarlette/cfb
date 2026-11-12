import { useWeekSelector } from '@/shared/hooks/useWeekSelector.js';
import { Centered } from '@/shared/components/Centered.jsx';
import { WeekSelect } from '@/shared/components/WeekSelect.jsx';
import { useStandings } from './hooks/useStandings.js';
import { weekInfo } from './scoring.js';
import { StandingsTable } from './components/StandingsTable.jsx';

export function ScoreboardScreen() {
  const sel = useWeekSelector(1);
  // Postseason isn't on the scoreboard yet (see README: how bowls/CFP points combine is TBD),
  // so it shows the last regular-season week.
  const week = typeof sel.week === 'number' ? sel.week : 15;
  const { setWeek } = sel;
  const currentWeek = typeof sel.currentWeek === 'number' ? sel.currentWeek : null;
  const weeks = sel.weeks.filter(w => typeof w === 'number');
  const { weeklyRecords, overallRecords, priorRanks, loading } = useStandings(week);
  // Only weeks that have happened (through the current one).
  const shownWeeks = currentWeek == null ? weeks : weeks.filter(w => w <= currentWeek);
  const info = weekInfo(week);

  return (
    <div className="pad">
      <div className="panel">
        <h2>Scoreboard</h2>
        <WeekSelect week={week} weeks={shownWeeks} onChange={setWeek} />
        {info?.isSample && <p className="sample-note">Week {week} scores are sample data — these games aren't final yet.</p>}
        <p className="muted small">
          Wk {week} is this week's points{info?.possible ? ` (out of ${info.possible})` : ''}. Total is the season through Week {week}{week > 0 ? `; arrows show the change since Week ${week - 1}` : ''}.
        </p>
        {loading ? <Centered>Loading…</Centered> : (
          <StandingsTable week={week} weeklyRecords={weeklyRecords} overallRecords={overallRecords} priorRanks={week > 0 ? priorRanks : null} />
        )}
      </div>
    </div>
  );
}
