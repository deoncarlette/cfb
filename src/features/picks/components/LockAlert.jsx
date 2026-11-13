import { formatKickoff } from '@/shared/utils/dates.js';

// When picks lock, at the top of the week. lock comes from lockInfo() in picksLogic.js.
export function LockAlert({ lock }) {
  if (lock.mode === 'kickoff') {
    if (lock.allLocked) return <p className="lock-alert locked">Every game has kicked off, so picks are locked.</p>;
    return (
      <p className="lock-alert">
        Each game locks at its own kickoff. Next kickoff: <strong>{formatKickoff(lock.lockAt)}</strong> ({lock.nextCount} {lock.nextCount === 1 ? 'game' : 'games'}).
      </p>
    );
  }
  if (!lock.lockAt) return null;
  return lock.allLocked
    ? <p className="lock-alert locked">Picks locked {formatKickoff(lock.lockAt)}.</p>
    : <p className="lock-alert">Picks lock <strong>{formatKickoff(lock.lockAt)}</strong>. Every game locks at once.</p>;
}
