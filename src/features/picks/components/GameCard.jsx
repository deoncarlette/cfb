import { MatchupPill } from './MatchupPill.jsx';
import { ConfidenceControl } from './ConfidenceControl.jsx';

// One draggable game: points on the left, the matchup pill, ↑/↓ on the right, venue below.
// index is the card's position (0 = top); total is how many cards there are.
export function GameCard({ game, index, total, picked, locked, dragProps, onPick, onMove, onSetPoints }) {
  return (
    <div className={'game-card' + (!picked ? ' unpicked' : '')} draggable={!locked} {...dragProps}>
      <MatchupPill game={game} picked={picked} disabled={locked} onPick={onPick} />
      <span className="game-venue">{game.venue}</span>
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
