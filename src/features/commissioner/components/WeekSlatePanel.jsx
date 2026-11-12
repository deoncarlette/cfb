import { bestRealRank, gameCategory } from '@/services/espn/index.js';
import { useWeekSelector } from '@/shared/hooks/useWeekSelector.js';
import { WeekSelect } from '@/shared/components/WeekSelect.jsx';
import { useWeekSlate } from '../hooks/useWeekSlate.js';
import { GameSection } from './GameSection.jsx';

const byKickoff = (a, b) => new Date(a.date) - new Date(b.date);
const SECTIONS = [
  { key: 'top25', label: 'Top 25', sort: (a, b) => bestRealRank(a) - bestRealRank(b) || byKickoff(a, b) },
  { key: 'power4', label: 'Power 4', sort: byKickoff },
  { key: 'other', label: 'All Other Games', sort: byKickoff }
];

export function WeekSlatePanel() {
  const { week, setWeek, weeks } = useWeekSelector(1);
  const slate = useWeekSlate(week);

  return (
    <div className="panel">
      <h2>This week's slate</h2>
      <p className="muted small">Pull games from ESPN, choose which count, set when picks lock. No access control yet — see the note in services/data/firebase/weeklyPicks.js.</p>

      <WeekSelect week={week} weeks={weeks} onChange={setWeek} />
      <div className="row-gap">
        <button onClick={slate.pullGames} disabled={slate.pulling}>{slate.pulling ? 'Pulling…' : 'Pull games from ESPN'}</button>
        <span className="muted small" style={{ alignSelf: 'center' }}>{slate.status}</span>
      </div>

      <label>Picks lock at</label>
      <input type="datetime-local" value={slate.deadline} onChange={e => slate.setDeadline(e.target.value)} />
      <p className="muted small">Leave blank to fall back to the earliest kickoff among included games.</p>

      <p className="selected-count">{slate.includedIds.size} of {slate.games.length} selected</p>
      {slate.games.length === 0 && !slate.pulling && <p className="muted small">No games pulled yet.</p>}

      {SECTIONS.map(section => (
        <GameSection
          key={section.key}
          label={section.label}
          games={slate.games.filter(g => gameCategory(g) === section.key).sort(section.sort)}
          includedIds={slate.includedIds}
          onToggle={slate.toggle}
          onSelectAll={slate.selectAll}
          onDeselectAll={slate.deselectAll}
        />
      ))}

      <button className="primary big" onClick={slate.save} disabled={slate.saving}>
        {slate.saving ? 'Saving…' : "Save this week's settings"}
      </button>
    </div>
  );
}
