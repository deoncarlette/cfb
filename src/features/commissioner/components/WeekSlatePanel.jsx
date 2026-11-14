import { bestRealRank, gameCategory, gameConference, rivalryFor, P4_ORDER, FBS_ORDER, FCS_ORDER } from '@/services/espn/index.js';
import { useWeekSelector } from '@/shared/hooks/useWeekSelector.js';
import { WeekSelect } from '@/shared/components/WeekSelect.jsx';
import { useWeekSlate } from '../hooks/useWeekSlate.js';
import { GameSection } from './GameSection.jsx';
import { formatKickoff, toDatetimeLocal } from '@/shared/utils/dates.js';
import { Segmented } from '@/shared/components/Segmented.jsx';

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
  const frozen = slate.lock.anyLocked;
  const lockChoice = slate.lockMode === 'kickoff' ? 'kickoff' : slate.deadline ? 'custom' : 'first';
  function chooseLock(choice) {
    slate.setLockMode(choice === 'kickoff' ? 'kickoff' : 'slate');
    if (choice === 'first') slate.setDeadline('');
    // Start the picker on the first kickoff (or the next hour), never empty.
    if (choice === 'custom' && !slate.deadline) {
      const start = firstKickoff ? new Date(firstKickoff) : new Date(Math.ceil(Date.now() / 3600000) * 3600000);
      slate.setDeadline(toDatetimeLocal(start.toISOString()));
    }
  }
  const firstKickoff = slate.games.filter(g => slate.includedIds.has(g.id)).map(g => g.date).sort((a, b) => new Date(a) - new Date(b))[0];

  return (
    <div className="panel">
      <h2>This week's slate</h2>
      <p className="muted small">Pull games from ESPN, choose which count, set when picks lock. No access control yet — see the note in services/data/firebase/weeklyPicks.js.</p>

      <WeekSelect week={week} weeks={weeks} onChange={setWeek} />
      {frozen && (
        <p className="bk-notice">
          {typeof week === 'number' ? `Week ${week}` : 'The postseason'} has started locking{slate.lock.mode === 'slate' && slate.lock.lockAt ? ` (${formatKickoff(slate.lock.lockAt)})` : ''}, so its settings are locked too. See how the pool picked on the Insights tab.
        </p>
      )}
      <div className={frozen ? 'slate-settings frozen' : 'slate-settings'}>
      <div className="row-gap">
        <button onClick={slate.pullGames} disabled={slate.pulling || frozen}>{slate.pulling ? 'Pulling…' : 'Pull games from ESPN'}</button>
        <span className="muted small" style={{ alignSelf: 'center' }}>{slate.status}</span>
      </div>
      {slate.games.some(g => g.simulated) && (
        <p className="bk-notice">These bowls are simulated until ESPN posts the real ones (usually early December). Don't save a bowl slate until then — the real games will have different IDs.</p>
      )}

      <label>Picks lock</label>
      {/* Three choices instead of a blank date field: the iPhone time picker can't be closed
          empty, so "first kickoff" is its own option and the picker only shows for a set time. */}
      <Segmented
        label="When picks lock"
        options={[['first', 'First kickoff'], ['custom', 'Set a time'], ['kickoff', 'Each game']]}
        value={lockChoice}
        onChange={chooseLock}
        disabled={frozen}
      />
      {lockChoice === 'first' && (
        <p className="muted small">The whole slate locks at the first kickoff of the selected games{firstKickoff ? ` (${formatKickoff(firstKickoff)})` : ''}.</p>
      )}
      {lockChoice === 'custom' && (
        <>
          <input type="datetime-local" aria-label="Slate locks at" disabled={frozen} value={slate.deadline} onChange={e => e.target.value && slate.setDeadline(e.target.value)} />
          <p className="muted small">The whole slate locks at this time.</p>
        </>
      )}
      {lockChoice === 'kickoff' && (
        <p className="muted small">Each game locks at its own kickoff. Players can keep changing picks on games that haven't started.</p>
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
          noteFor={g => {
            // The game's name from ESPN (bowl names, neutral-site games), plus a rivalry or
            // in-state tag when it's a different label.
            const tag = rivalryFor(g, false);
            return [g.title, tag && tag !== g.title ? tag : null].filter(Boolean).join(', ') || null;
          }}
          includedIds={slate.includedIds}
          onToggle={slate.toggle}
          onSelectAll={slate.selectAll}
          onDeselectAll={slate.deselectAll}
          disabled={frozen}
        />
      ))}

      </div>
      {!frozen && (
        <button className="primary big" onClick={slate.save} disabled={slate.saving || !slate.dirty}>
          {slate.saving ? 'Saving…' : slate.dirty ? "Save this week's settings" : 'Saved'}
        </button>
      )}
    </div>
  );
}
