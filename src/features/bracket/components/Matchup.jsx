import { GAME_BY_KEY, CHAMPIONSHIP_KEY, participants, slotPlaceholder, bowlFor } from '../bracketLogic.js';
import { TeamRow } from './TeamRow.jsx';

// One bracket game (two TeamRows). Any team that's already in the game can be picked, even if
// its opponent isn't decided yet — so you can run Georgia straight to the title, round by round,
// and fill in the rest later.
export function Matchup({ gameKey, bySeed, teamById, winners, statusFor, onPick, locked, bowls }) {
  const g = GAME_BY_KEY[gameKey];
  const [topId, bottomId] = participants(gameKey, bySeed, winners);
  const pick = winners[gameKey];
  const status = statusFor ? statusFor(gameKey) : null;
  const canPick = !locked && !!onPick;
  // Every game gets a label line so games in the same row line up: first-round games are at
  // the higher seed's stadium; bowl games show TBA until the commissioner assigns the bowl.
  const host = g.round === 'r1' ? teamById[topId] : null;
  const bowl = g.round === 'r1'
    ? { name: host ? `At ${host.name}` : 'Campus site', date: '' }
    : bowlFor(gameKey, bowls) || { name: 'Bowl TBA', date: '', tba: true };
  return (
    <div className="bk-game">
      <div className={'bk-bowl' + (bowl.tba ? ' tba' : '')}>
        <span className="bk-bowl-name">{bowl.name}</span>
        {bowl.date && <span className="bk-bowl-date">{bowl.date}</span>}
      </div>
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
    </div>
  );
}
