import { displayRank } from '@/services/espn/index.js';
import { textForBackground, teamFill, teamTextOnDark } from '@/shared/utils/colors.js';
import { TeamLogo } from '@/shared/components/TeamLogo.jsx';

// One half of the matchup pill. Not picked: black, with the name in the team's color.
// Picked: filled with the team's color. Tap again to clear.
// side: 'away' (left) or 'home' (right, mirrored). score shows once the game has started.
export function MatchupSide({ team, side, selected, lost, score, disabled, onClick }) {
  const rank = displayRank(team);
  const fill = teamFill(team);
  const ink = textForBackground(fill);
  // Regular logo on the black side (keeps the school's colors). Once picked, a dark team fill
  // switches to ESPN's dark-background logo so it doesn't vanish into the same color.
  const onDark = selected && ink === '#ffffff';
  return (
    <button
      type="button"
      className={`matchup-side ${side}` + (selected ? ' sel' : '') + (lost ? ' lost' : '')}
      style={{ '--fill': fill, '--fill-ink': ink, '--name': teamTextOnDark(team) }}
      aria-pressed={selected}
      aria-label={`${team.name}${score != null ? ` ${score}` : ''}${selected ? ', your pick' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      <TeamLogo team={team} onDark={onDark} />
      <span className="team-text">
        {rank && <span className="team-rank">{rank}</span>}
        <span className="team-name">{team.name}</span>
        <span className="team-name team-abbr">{team.abbr || team.name}</span>
      </span>
      {score != null && <span className="team-score">{score}</span>}
    </button>
  );
}

