import { matchupChip, gameWinnerId } from '@/services/espn/index.js';
import { MatchupSide } from './MatchupSide.jsx';

// Broadcast-style matchup: away team on the left, home on the right. The picked side fills
// with its color and the other fades. Scores appear by the seam once the game starts, with
// FINAL (or the live clock) in a chip on the seam.
export function MatchupPill({ game, picked, disabled, onPick }) {
  const [away, home] = game.competitors;
  const chip = matchupChip(game);
  const started = game.completed || game.state === 'in';
  const winner = gameWinnerId(game);
  const side = (team, which) => (
    <MatchupSide
      team={team}
      side={which}
      selected={picked === team.id}
      lost={!!winner && winner !== team.id}
      score={started ? team.score : null}
      disabled={disabled}
      onClick={() => onPick(team.id)}
    />
  );
  return (
    <div className={'matchup' + (picked ? ' has-pick' : '') + (chip ? ' has-chip' : '') + (started ? ' started' : '')}>
      {side(away, 'away')}
      {chip && <span className="matchup-mid">{chip}</span>}
      {side(home, 'home')}
    </div>
  );
}
