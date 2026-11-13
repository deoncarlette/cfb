import { useState } from 'react';
import { formatKickoff, formatGameDay, formatTbdDay } from '@/shared/utils/dates.js';
import { listedRivalry } from '@/services/espn/index.js';
import { GameDetails } from './details/GameDetails.jsx';
import { MatchupPill } from './MatchupPill.jsx';
import { ConfidenceControl } from './ConfidenceControl.jsx';

// One game: kickoff and betting line above the matchup pill; below it the game's name from
// ESPN's notes or the rivalry list if it has one (Rose Bowl, Red River Rivalry…), the TV network (stadium if ESPN
// lists none), and the details button; points on the right.
// The button under the pill opens the matchup info (before kickoff) or the box score.
// total is how many cards there are; canUp/canDown say whether the arrows can move it.
// layout: 'pill' (default) or 'whole' (trial: the two teams fill the card edge to edge, points in
// a chip on the seam).
export function GameCard({ game, total, points, result, live, picked, missed, locked, canUp, canDown, pool, dragProps, onPick, onMove, onSetPoints, layout = 'pill' }) {
  const [open, setOpen] = useState(false);
  const isLive = game.state === 'in';
  const started = game.completed || isLive;
  const line = !game.completed && !isLive && game.line;
  // ESPN's name for the game (bowls, neutral-site games), else a known rivalry's name.
  const gameName = game.title || listedRivalry(game);
  return (
    <div className={'game-card' + (layout === 'whole' ? ' whole' : '') + (!picked ? ' unpicked' : '') + (isLive ? ' live' : '')} draggable={!locked} {...(locked ? {} : dragProps)}>
      <div className="game-meta">
        {game.completed
          ? <span><strong className="game-final">Final</strong> {formatGameDay(game.date)}</span>
          : isLive
            ? <span><strong className="live-badge">Live</strong> {game.status}<Possession game={game} /></span>
            : <span>{game.timeTbd ? formatTbdDay(game.date) : formatKickoff(game.date)}</span>}
        {line && (
          <span className="game-line">
            {line.spread && <span>{line.spread}</span>}
            {line.overUnder != null && <span>O/U {line.overUnder}</span>}
          </span>
        )}
      </div>
      <MatchupPill game={game} picked={picked} disabled={locked} onPick={onPick} />
      <button type="button" className="game-venue details-toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {gameName && <span className="venue-name game-title">{gameName}</span>}
        {(game.broadcast || !gameName) && <span className="venue-name">{game.broadcast || game.venue}</span>}
        <span className="details-label">{started ? 'Box score' : 'Matchup'} <span className="chev" aria-hidden="true">▾</span></span>
      </button>
      <ConfidenceControl
        chip={layout === 'whole'}
        missed={missed}
        points={points}
        max={total}
        canUp={canUp}
        canDown={canDown}
        locked={locked}
        result={result}
        live={live}
        onSetPoints={onSetPoints}
        onUp={() => onMove(-1)}
        onDown={() => onMove(1)}
      />
      {open && <GameDetails game={game} pool={pool} />}
    </div>
  );
}

// Who has the ball, with down & distance when ESPN sends it: "MICH 2nd & 7 at OSU 14".
// Red in the red zone. Without down & distance (e.g. the test replay): "MICH ball".
function Possession({ game }) {
  const s = game.situation;
  const team = s && game.competitors.find(c => c.id === s.possession);
  if (!team) return null;
  return (
    <span className={'possession' + (s.redZone ? ' red-zone' : '')}>
      <strong>{team.abbr || team.name}</strong> {s.downDistance || 'ball'}
    </span>
  );
}
