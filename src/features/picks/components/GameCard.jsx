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
// layout: 'pill' (default), 'whole' (trial: the two teams fill the card edge to edge, points in
// a chip on the seam, and one tappable line under them — kickoff or live clock on the left, the
// betting line on the right until kickoff and the network after; game name, network before
// kickoff and who has the ball move into the expansion) or 'teams' (whole, but nothing else on the card: kickoff, line, game name
// and network move into the expansion, opened by the small handle under the teams).
export function GameCard({ game, total, points, result, live, picked, missed, locked, canUp, canDown, pool, dragProps, onPick, onMove, onSetPoints, layout = 'pill' }) {
  const [open, setOpen] = useState(false);
  const isLive = game.state === 'in';
  const started = game.completed || isLive;
  const line = !game.completed && !isLive && game.line;
  // ESPN's name for the game (bowls, neutral-site games), else a known rivalry's name.
  const gameName = game.title || listedRivalry(game);
  const bare = layout === 'teams';
  const strip = layout === 'whole';
  const chip = strip || bare;
  const meta = (
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
  );
  const names = <>
    {gameName && <span className="venue-name game-title">{gameName}</span>}
    {(game.broadcast || !gameName) && <span className="venue-name">{game.broadcast || game.venue}</span>}
  </>;
  const status = game.completed
    ? <span><strong className="game-final">Final</strong> {formatGameDay(game.date)}</span>
    : isLive
      ? <span><strong className="live-badge">Live</strong> {game.status}</span>
      : <span>{game.timeTbd ? formatTbdDay(game.date) : formatKickoff(game.date)}</span>;
  const stripInfo = (gameName || !started || isLive) && (
    <div className="bare-info strip-info">
      {isLive && <Possession game={game} />}
      <div className="bare-names">
        {gameName && <span className="venue-name game-title">{gameName}</span>}
        {!started && <span className="venue-name">{game.broadcast || game.venue}</span>}
      </div>
    </div>
  );
  return (
    <div className={'game-card' + (chip ? ' whole' : '') + (bare ? ' teams' : '') + (!picked ? ' unpicked' : '') + (isLive ? ' live' : '')} draggable={!locked} {...(locked ? {} : dragProps)}>
      {!chip && meta}
      <MatchupPill game={game} picked={picked} disabled={locked} onPick={onPick} />
      {strip
        ? <button type="button" className="game-meta game-strip details-toggle" aria-expanded={open} aria-label={open ? 'Hide game details' : 'Show game details'} onClick={() => setOpen(o => !o)}>
            {status}
            <span className="game-line">
              {started
                ? <span className="strip-network">{game.broadcast || game.venue}</span>
                : line && <>
                    {line.spread && <span>{line.spread}</span>}
                    {line.overUnder != null && <span>O/U {line.overUnder}</span>}
                  </>}
              <span className="chev" aria-hidden="true">▾</span>
            </span>
          </button>
        : bare
        ? <button type="button" className="game-venue details-toggle card-handle" aria-expanded={open} aria-label={open ? 'Hide game details' : 'Show game details'} onClick={() => setOpen(o => !o)}>
            <span className="chev" aria-hidden="true">▾</span>
          </button>
        : <button type="button" className="game-venue details-toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
            {names}
            <span className="details-label">{started ? 'Box score' : 'Matchup'} <span className="chev" aria-hidden="true">▾</span></span>
          </button>}
      <ConfidenceControl
        chip={chip}
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
      {open && strip && stripInfo}
      {open && bare && <div className="bare-info">{meta}<div className="bare-names">{names}</div></div>}
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
