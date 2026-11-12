import { displayRank } from '@/services/espn/index.js';
import { textForBackground } from '@/shared/utils/colors.js';
import { TeamLogo } from '@/shared/components/TeamLogo.jsx';

// One half of the matchup pill, filled with the team's color. Tap to pick that team.
// side: 'away' (left) or 'home' (right, mirrored).
export function MatchupSide({ team, side, selected, disabled, onClick }) {
  const rank = displayRank(team);
  return (
    <button
      type="button"
      className={`matchup-side ${side}` + (selected ? ' sel' : '')}
      style={{ '--team': team.color, '--ink': textForBackground(team.color) }}
      aria-pressed={selected}
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
