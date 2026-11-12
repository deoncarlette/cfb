import { displayRank } from '@/services/espn/index.js';
import { textForBackground, teamFill, teamTextOnDark } from '@/shared/utils/colors.js';
import { TeamLogo } from '@/shared/components/TeamLogo.jsx';

// One half of the matchup pill. Not picked: black, with the name in the team's color.
// Picked: filled with the team's color (or its secondary color if the main one is too dark
// or gray to stand out), plus a ✓ on the logo. Tap again to clear.
// side: 'away' (left) or 'home' (right, mirrored).
export function MatchupSide({ team, side, selected, disabled, onClick }) {
  const rank = displayRank(team);
  const fill = teamFill(team);
  return (
    <button
      type="button"
      className={`matchup-side ${side}` + (selected ? ' sel' : '')}
      style={{ '--fill': fill, '--fill-ink': textForBackground(fill), '--name': teamTextOnDark(team) }}
      aria-pressed={selected}
      aria-label={`${team.name}${selected ? ' (your pick, tap to clear)' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      <TeamLogo team={team} />
      <span className="team-text">
        {rank && <span className="team-rank">#{rank}</span>}
        <span className="team-name">{team.name}</span>
      </span>
    </button>
  );
}
