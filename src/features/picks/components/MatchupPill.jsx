import { matchupChip } from '@/services/espn/index.js';
import { MatchupSide } from './MatchupSide.jsx';

// Broadcast-style matchup: away team's color on the left, home on the right, kickoff in the
// middle. Once a winner is picked, the other side fades to gray.
export function MatchupPill({ game, picked, disabled, onPick }) {
  const [away, home] = game.competitors;
  const chip = matchupChip(game);
  return (
    <div className={'matchup' + (picked ? ' has-pick' : '')}>
      <MatchupSide team={away} side="away" selected={picked === away.id} disabled={disabled} onClick={() => onPick(away.id)} />
      <span className="matchup-mid">{chip.top}{chip.bottom && <small>{chip.bottom}</small>}</span>
      <MatchupSide team={home} side="home" selected={picked === home.id} disabled={disabled} onClick={() => onPick(home.id)} />
    </div>
  );
}
