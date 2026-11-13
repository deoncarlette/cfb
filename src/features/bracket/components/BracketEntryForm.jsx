import { GAMES } from '../bracketLogic.js';
import { formatKickoff } from '@/shared/utils/dates.js';

// Tiebreaker field (plus the "preview only" notice before Selection Day). Your name comes from
// the name box at the top of the Picks tab.
export function BracketEntryForm({ projection, ready, my, locked, lockIso }) {
  return (
    <>
      {projection && (
        <p className="bk-notice">
          Preview only — projected from the current {projection.pollName}: the top team in each Power 4 conference and the top Group of Six team get the automatic bids, the rest go by rank. The real field is set on Selection Day, and submissions open once the commissioner saves it.
        </p>
      )}
      {ready && (
        <>
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
