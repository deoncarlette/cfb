import { displayRank } from '@/services/espn/index.js';
import { textForBackground } from '@/shared/utils/colors.js';
import { TeamLogo } from '@/shared/components/TeamLogo.jsx';

// One team's button on a game card. Fills with the team's color when picked.
export function TeamToggle({ team, selected, disabled, onClick }) {
  const ink = textForBackground(team.color);
  const rank = displayRank(team);
  return (
    <button
      type="button"
      disabled={disabled}
      className={'team-toggle' + (selected ? ' sel' : '')}
      style={selected ? { background: team.color, borderColor: team.color, color: ink } : undefined}
      onClick={onClick}
    >
      <TeamLogo team={team} />
      {rank && <span className="team-rank" style={selected ? { color: ink } : undefined}>#{rank}</span>}
      <span>{team.name}</span>
    </button>
  );
}
