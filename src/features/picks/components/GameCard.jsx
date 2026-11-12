import { gameStatusLabel } from '@/services/espn/index.js';
import { TeamToggle } from './TeamToggle.jsx';
import { ConfidenceControl } from './ConfidenceControl.jsx';

// One draggable game: kickoff + venue, the two team buttons, and its confidence points.
// index is the card's position (0 = top); total is how many cards there are.
export function GameCard({ game, index, total, picked, locked, dragProps, onPick, onMove, onSetPoints }) {
  const [away, home] = game.competitors;
  return (
    <div className={'card-row combo-card' + (!picked ? ' unpicked' : '')} draggable={!locked} {...dragProps}>
      <div className="drag-handle">&#8942;&#8942;</div>
      <div className="combo-body">
        <div className="game-meta"><span>{gameStatusLabel(game)}</span><span>{game.venue}</span></div>
        <div className="teams-row">
          {[away, home].map(team => (
            <TeamToggle key={team.id} team={team} selected={picked === team.id} disabled={locked} onClick={() => onPick(team.id)} />
          ))}
        </div>
      </div>
      <ConfidenceControl
        points={total - index}
        max={total}
        canUp={index > 0}
        canDown={index < total - 1}
        disabled={locked}
        onSetPoints={onSetPoints}
        onUp={() => onMove(-1)}
        onDown={() => onMove(1)}
      />
    </div>
  );
}
