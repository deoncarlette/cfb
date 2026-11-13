import { displayRank } from '@/services/espn/index.js';
import { textForBackground, teamFill, isBlackOrGray } from '@/shared/utils/colors.js';
import { TeamLogo, darkLogoUrl } from '@/shared/components/TeamLogo.jsx';
import { useLogoTone } from '@/shared/hooks/useLogoTone.js';
import { useDocTheme } from '@/shared/hooks/useDocTheme.js';

// One half of the matchup pill. Not picked: plain name (white in dark mode) with the team's logo.
// Picked: filled with the team's color. Tap again to clear.
// side: 'away' (left) or 'home' (right, mirrored). score shows once the game has started.
export function MatchupSide({ team, side, selected, lost, score, disabled, onClick }) {
  const rank = displayRank(team);
  const fill = teamFill(team);
  const ink = textForBackground(fill);
  // Regular logo on the black side (keeps the school's colors). Once picked, a dark team fill
  // switches to ESPN's dark-background logo so it doesn't vanish into the same color.
  // Black logos (Iowa, Wake Forest) on the black side (dark mode): ESPN's dark-background logo,
  // and if that's black too (or missing), a thin light outline. When the logo can't be measured,
  // a black/gray team color stands in for "black logo".
  const theme = useDocTheme(); // always called (hooks can't be conditional)
  const blackSide = !selected && theme !== 'light';
  const tone = useLogoTone(blackSide ? team.logo : null);
  const blackLogo = blackSide && (tone === 'dark' || (tone == null && isBlackOrGray(team.color)));
  const darkTone = useLogoTone(blackLogo ? darkLogoUrl(team.logo) : null);
  const onDark = (selected && ink === '#ffffff') || blackLogo;
  const outline = blackLogo && darkTone !== 'light';
  return (
    <button
      type="button"
      className={`matchup-side ${side}` + (selected ? ' sel' : '') + (lost ? ' lost' : '')}
      style={{ '--fill': fill, '--fill-ink': ink }}
      aria-pressed={selected}
      aria-label={`${team.name}${score != null ? ` ${score}` : ''}${selected ? ', your pick' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      <TeamLogo team={team} onDark={onDark} outline={outline} />
      <span className="team-text">
        {rank && <span className="team-rank">{rank}</span>}
        <span className="team-name">{team.name}</span>
        <span className="team-name team-abbr">{team.abbr || team.name}</span>
      </span>
      {score != null && <span className="team-score">{score}</span>}
    </button>
  );
}

