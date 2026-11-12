import { useState } from 'react';
import { formatKickoff, formatGameDay } from '@/shared/utils/dates.js';
import { GameDetails } from './details/GameDetails.jsx';
import { MatchupPill } from './MatchupPill.jsx';
import { ConfidenceControl } from './ConfidenceControl.jsx';

// One game: kickoff and betting line above the matchup pill, venue below, points on the right.
// The button under the pill opens the matchup info (before kickoff) or the box score.
// index is the card's position (0 = top); total is how many cards there are.
export function GameCard({ game, index, total, points, result, live, picked, locked, dragProps, onPick, onMove, onSetPoints }) {
  const [open, setOpen] = useState(false);
  const isLive = game.state === 'in';
  const started = game.completed || isLive;
  const line = !game.completed && !isLive && game.line;
  return (
    <div className={'game-card' + (!picked ? ' unpicked' : '') + (isLive ? ' live' : '')} draggable={!locked} {...(locked ? {} : dragProps)}>
      <div className="game-meta">
        {game.completed
          ? <span><strong className="game-final">Final</strong> {formatGameDay(game.date)}</span>
          : isLive
            ? <span><strong className="live-badge">Live</strong> {game.status}</span>
            : <span>{formatKickoff(game.date)}</span>}
        {line && (
          <span className="game-line">
            {line.spread && <span>{line.spread}</span>}
            {line.overUnder != null && <span>O/U {line.overUnder}</span>}
          </span>
        )}
      </div>
      <MatchupPill game={game} picked={picked} disabled={locked} onPick={onPick} />
      <button type="button" className="game-venue details-toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span className="venue-name">{game.venue}</span>
        <span className="details-label">{started ? 'Box score' : 'Matchup'} <span className="chev" aria-hidden="true">▾</span></span>
      </button>
      <ConfidenceControl
        points={points}
        max={total}
        canUp={index > 0}
        canDown={index < total - 1}
        locked={locked}
        result={result}
        live={live}
        onSetPoints={onSetPoints}
        onUp={() => onMove(-1)}
        onDown={() => onMove(1)}
      />
      {open && <GameDetails game={game} />}
    </div>
  );
}
