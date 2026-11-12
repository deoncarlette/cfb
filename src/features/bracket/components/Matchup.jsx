import { GAME_BY_KEY, CHAMPIONSHIP_KEY, participants, slotPlaceholder } from '../bracketLogic.js';
import { TeamRow } from './TeamRow.jsx';

// One bracket game (two TeamRows). Clickable only once both teams are known.
export function Matchup({ gameKey, bySeed, teamById, winners, statusFor, onPick, locked }) {
  const g = GAME_BY_KEY[gameKey];
  const [topId, bottomId] = participants(gameKey, bySeed, winners);
  const pick = winners[gameKey];
  const status = statusFor ? statusFor(gameKey) : null;
  const canPick = !locked && onPick && topId && bottomId;
  return (
    <div className={'bk-match' + (gameKey === CHAMPIONSHIP_KEY ? ' title' : '')}>
      {[[g.top, topId], [g.bottom, bottomId]].map(([slot, id], i) => (
        <TeamRow
          key={i}
          team={id ? teamById[id] : null}
          placeholder={slotPlaceholder(slot)}
          seed={slot.seed}
          selected={!!pick && pick === id}
          status={status}
          disabled={!canPick}
          onClick={() => onPick(gameKey, id)}
        />
      ))}
    </div>
  );
}
