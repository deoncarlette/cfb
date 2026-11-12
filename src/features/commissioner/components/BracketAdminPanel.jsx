import { BracketView } from '@/features/bracket/components/BracketView.jsx';
import { usePlayoffAdmin } from '../hooks/usePlayoffAdmin.js';
import { SeedPicker } from './SeedPicker.jsx';

// Set all 12 seeds on Selection Day, when brackets lock, and the winners as games finish.
export function BracketAdminPanel() {
  const admin = usePlayoffAdmin();
  const poll = admin.pollName || 'rankings';

  return (
    <div className="panel">
      <p className="section-label">Playoff bracket</p>
      <h2>Seed the field</h2>
      <p className="muted small">
        Set all 12 seeds after Selection Day (top 4 get byes, no re-seeding). Until then the Bracket tab shows a preview from the current {poll} and submissions stay closed.
      </p>

      <div className="row-gap">
        <button onClick={admin.fillFromRankings} disabled={!admin.candidates.length}>Fill 1–12 from {poll}</button>
      </div>
      <p className="muted small">Then adjust for the five conference-champion auto-bids — picking a team that's already seeded swaps the two.</p>

      <SeedPicker seedIds={admin.seedIds} candidates={admin.candidates} onAssign={admin.assignSeed} />
      {admin.seedsChanged && admin.entryCount > 0 && (
        <p className="bk-notice">{admin.entryCount} bracket(s) were submitted against the saved field. Changing seeds now can invalidate their picks.</p>
      )}

      <label>Brackets lock at</label>
      <input type="datetime-local" value={admin.lock} onChange={e => admin.setLock(e.target.value)} />
      <p className="muted small">Set this to the first first-round kickoff. Brackets also lock as soon as any result is recorded.</p>

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

      <button className="primary big" onClick={admin.save} disabled={admin.busy}>{admin.busy ? 'Working…' : 'Save playoff settings'}</button>
    </div>
  );
}
