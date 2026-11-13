import { bestRealRank, gameCategory, gameConference, rivalryFor, P4_ORDER, FBS_ORDER, FCS_ORDER, POSTSEASON } from '@/services/espn/index.js';
import { useWeekSelector } from '@/shared/hooks/useWeekSelector.js';
import { WeekSelect } from '@/shared/components/WeekSelect.jsx';
import { useWeekSlate } from '../hooks/useWeekSlate.js';
import { GameSection } from './GameSection.jsx';
import { formatKickoff } from '@/shared/utils/dates.js';

const byKickoff = (a, b) => new Date(a.date) - new Date(b.date);
// Rivalry and in-state games aren't a section of their own — they're labeled within each section.
const SECTIONS = [
  { key: 'top25', label: 'Top 25', sort: (a, b) => bestRealRank(a) - bestRealRank(b) || byKickoff(a, b) },
  { key: 'power4', label: 'Power 4', sort: byKickoff, subgroupOf: g => gameConference(g, P4_ORDER), order: () => P4_ORDER },
  { key: 'meac', label: 'MEAC', sort: byKickoff },
  { key: 'fbs', label: 'FBS', sort: byKickoff, subgroupOf: g => gameConference(g, FBS_ORDER), order: () => FBS_ORDER },
  { key: 'fcs', label: 'FCS', sort: byKickoff, subgroupOf: g => gameConference(g, FCS_ORDER), order: () => FCS_ORDER },
  { key: 'other', label: 'All Other Games', sort: byKickoff }
];

export function WeekSlatePanel() {
  const { week, setWeek, weeks } = useWeekSelector(1);
  const slate = useWeekSlate(week);
  const firstKickoff = slate.games.filter(g => slate.includedIds.has(g.id)).map(g => g.date).sort((a, b) => new Date(a) - new Date(b))[0];

  return (
    <div className="panel">
      <h2>This week's slate</h2>
      <p className="muted small">Pull games from ESPN, choose which count, set when picks lock. No access control yet — see the note in services/data/firebase/weeklyPicks.js.</p>

      <WeekSelect week={week} weeks={weeks} onChange={setWeek} />
      <div className="row-gap">
        <button onClick={slate.pullGames} disabled={slate.pulling}>{slate.pulling ? 'Pulling…' : 'Pull games from ESPN'}</button>
        <span className="muted small" style={{ alignSelf: 'center' }}>{slate.status}</span>
      </div>

      <label>Picks lock</label>
      <div className="subtab-track" role="radiogroup" aria-label="When picks lock">
        <button type="button" role="radio" aria-checked={slate.lockMode === 'slate'} className={'subtab-btn' + (slate.lockMode === 'slate' ? ' active' : '')} onClick={() => slate.setLockMode('slate')}>Whole slate at once</button>
        <button type="button" role="radio" aria-checked={slate.lockMode === 'kickoff'} className={'subtab-btn' + (slate.lockMode === 'kickoff' ? ' active' : '')} onClick={() => slate.setLockMode('kickoff')}>Each game at kickoff</button>
      </div>
      {slate.lockMode === 'slate' ? (
        <>
          <input type="datetime-local" aria-label="Slate locks at" value={slate.deadline} onChange={e => slate.setDeadline(e.target.value)} />
          <p className="muted small">
            Leave blank to lock at the first kickoff of the selected games{firstKickoff ? ` (${formatKickoff(firstKickoff)})` : ''}.
          </p>
        </>
      ) : (
        <p className="muted small">Players can keep changing picks on games that haven't started. A game's pick and points lock when it kicks off.</p>
      )}

      <p className="selected-count">{slate.includedIds.size} of {slate.games.length} selected</p>
      {slate.games.length === 0 && !slate.pulling && <p className="muted small">No games pulled yet.</p>}

      {SECTIONS.map(section => (
        <GameSection
          key={week + ':' + section.key}
          label={section.label}
          games={slate.games.filter(g => gameCategory(g) === section.key).sort(section.sort)}
          subgroupOf={section.subgroupOf}
          order={section.order?.()}
          noteFor={g => rivalryFor(g, week !== POSTSEASON)}
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
