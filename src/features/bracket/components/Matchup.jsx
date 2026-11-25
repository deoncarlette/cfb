import { GAME_BY_KEY, CHAMPIONSHIP_KEY, participants, slotPlaceholder } from '../bracketLogic.js';
import { TeamRow } from './TeamRow.jsx';

// One bracket game (two TeamRows). Any team that's already in the game can be picked, even if
// its opponent isn't decided yet — so you can run Georgia straight to the title, round by round,
// and fill in the rest later.
export function Matchup({ gameKey, bySeed, teamById, winners, statusFor, onPick, locked }) {
  const g = GAME_BY_KEY[gameKey];
  const [topId, bottomId] = participants(gameKey, bySeed, winners);
  const pick = winners[gameKey];
  const status = statusFor ? statusFor(gameKey) : null;
  const canPick = !locked && !!onPick;
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
          disabled={!canPick || !id}
          onClick={() => onPick(gameKey, id)}
        />
      ))}
    </div>
  );
}
