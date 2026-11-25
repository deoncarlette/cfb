import { Segmented } from '@/shared/components/Segmented.jsx';
import { toDatetimeLocal } from '@/shared/utils/dates.js';
import { BracketView } from '@/features/bracket/components/BracketView.jsx';
import { usePlayoffAdmin } from '../hooks/usePlayoffAdmin.js';
import { SeedPicker } from './SeedPicker.jsx';

// Set all 12 seeds on Selection Day, when brackets lock, and the winners as games finish.
export function BracketAdminPanel() {
  const admin = usePlayoffAdmin();
  const poll = admin.pollName || 'rankings';

  return (
    <div className="panel">
      <h2>Playoff bracket</h2>
      <p className="muted small">
        Set all 12 seeds after Selection Day (top 4 get byes, no re-seeding). Until then the Bracket tab shows a preview from the current {poll} and submissions stay closed.
      </p>

      <div className="row-gap">
        <button onClick={admin.fillFromRankings} disabled={!admin.candidates.length || admin.fieldLocked}>Project the field from {poll}</button>
      </div>
      <p className="muted small">Fills all 12 seeds: the top team in each Power 4 conference and the top Group of Six team (stand-ins for the five conference champions), Notre Dame if it's top 12, then at-large by rank. Once the conference title games are played, swap in the actual champions — picking a team that's already seeded swaps the two.</p>

      {admin.fieldLocked && <p className="bk-notice">Brackets are locked, so the field and lock time can't change. Record results below as games finish.</p>}
      <SeedPicker seedIds={admin.seedIds} candidates={admin.candidates} onAssign={admin.assignSeed} disabled={admin.fieldLocked} />
      {admin.seedsChanged && admin.entryCount > 0 && (
        <p className="bk-notice">{admin.entryCount} bracket(s) were submitted against the saved field. Changing seeds now can invalidate their picks.</p>
      )}

      <label>Brackets lock</label>
      {/* No blank date field (the iPhone picker can't be closed empty): pick "Set a time" to show it. */}
      <Segmented
        label="When brackets lock"
        options={[['result', 'First result'], ['custom', 'Set a time']]}
        value={admin.lock ? 'custom' : 'result'}
        disabled={admin.fieldLocked}
        onChange={choice => admin.setLock(choice === 'result' ? '' : admin.lock || toDatetimeLocal(new Date(Math.ceil(Date.now() / 3600000) * 3600000).toISOString()))}
      />
      {admin.lock && <input type="datetime-local" aria-label="Brackets lock at" disabled={admin.fieldLocked} value={admin.lock} onChange={e => e.target.value && admin.setLock(e.target.value)} />}
      <p className="muted small">{admin.lock ? 'Set this to the first first-round kickoff. ' : ''}Brackets also lock as soon as any result is recorded.</p>

      {admin.fieldComplete && (
        <>
          <div className="section-heading">
            <span className="section-label">Results</span>
            <button onClick={admin.syncFromEspn} disabled={admin.busy}>Pull results from ESPN</button>
          </div>
          <p className="muted small">Tap the winner of each finished game (tap again to undo).</p>
        </>
      )}
      <span className="muted small">{admin.status}</span>

      {admin.fieldComplete && (
        <>
          <div className="bracket-wrap in-panel">
            <BracketView seeds={admin.seeds} winners={admin.results} onPick={admin.markResult} />
          </div>
          <label>Title game total points (tiebreaker)</label>
          <input type="number" inputMode="numeric" value={admin.titleTotal} onChange={e => admin.setTitleTotal(e.target.value)} placeholder="Filled in after the title game" />
        </>
      )}

      <button className="primary big" onClick={admin.save} disabled={admin.busy || !admin.dirty}>{admin.busy ? 'Working…' : admin.dirty ? 'Save playoff settings' : 'Saved'}</button>
    </div>
  );
}
