import { GAMES } from '../bracketLogic.js';
import { formatKickoff } from '@/shared/utils/dates.js';

// Name + tiebreaker fields (plus the "preview only" notice before Selection Day).
export function BracketEntryForm({ projection, ready, my, locked, lockIso }) {
  return (
    <>
      {projection && (
        <p className="bk-notice">
          Preview only — seeded straight from the current {projection.pollName}. The real field is set on Selection Day, and submissions open once the commissioner saves it.
        </p>
      )}
      {ready && (
        <>
          <label>Your name</label>
          <input value={my.userName} onChange={e => my.setUserName(e.target.value)} onBlur={my.loadExisting} placeholder="Type your name" disabled={!!projection} />
          <label>Tiebreaker — title game total points</label>
          <input type="number" inputMode="numeric" min={0} value={my.tiebreaker} onChange={e => my.setTiebreaker(e.target.value)} placeholder="e.g. 51" disabled={locked} />
          <p className="muted small">
            {my.pickedCount} of {GAMES.length} games picked.
            {lockIso && <> Brackets lock {formatKickoff(lockIso)}{locked ? ' — locked' : ''}.</>}
          </p>
        </>
      )}
    </>
  );
}
