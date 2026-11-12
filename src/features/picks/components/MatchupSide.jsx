import { displayRank } from '@/services/espn/index.js';
import { textForBackground, teamFill, teamTextOnDark } from '@/shared/utils/colors.js';
import { TeamLogo } from '@/shared/components/TeamLogo.jsx';

// One half of the matchup pill. Not picked: black, with the name in the team's color.
// Picked: filled with the team's color. Tap again to clear.
// side: 'away' (left) or 'home' (right, mirrored). score shows once the game has started.
// hasBall: live game, this team has possession (redZone: inside the opponent's 20).
export function MatchupSide({ team, side, selected, lost, score, hasBall, redZone, disabled, onClick }) {
  const rank = displayRank(team);
  const fill = teamFill(team);
  return (
    <button
      type="button"
      className={`matchup-side ${side}` + (selected ? ' sel' : '') + (lost ? ' lost' : '')}
      style={{ '--fill': fill, '--fill-ink': textForBackground(fill), '--name': teamTextOnDark(team) }}
      aria-pressed={selected}
      aria-label={`${team.name}${score != null ? ` ${score}` : ''}${hasBall ? ', has the ball' : ''}${selected ? ', your pick' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      <TeamLogo team={team} />
      <span className="team-text">
        {rank && <span className="team-rank">#{rank}</span>}
        <span className="team-name">{team.name}</span>
        <span className="team-name team-abbr">{team.abbr || team.name}</span>
      </span>
      {score != null && <span className="team-score">{score}{hasBall && <Football redZone={redZone} />}</span>}
    </button>
  );
}

function Football({ redZone }) {
  return (
    <span className={'possession' + (redZone ? ' red-zone' : '')} title={redZone ? 'Has the ball (red zone)' : 'Has the ball'}>
      <svg viewBox="0 0 24 16" width="18" height="12" aria-hidden="true">
        <ellipse cx="12" cy="8" rx="11" ry="7" fill="#8a4b22" stroke="#fff" strokeOpacity=".55" strokeWidth="1" />
        <path d="M7 8h10M9.5 6v4M12 6v4M14.5 6v4" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
