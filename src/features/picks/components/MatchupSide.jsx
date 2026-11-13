import { displayRank } from '@/services/espn/index.js';
import { textForBackground, teamFill, isBlackOrGray } from '@/shared/utils/colors.js';
import { TeamLogo, darkLogoUrl } from '@/shared/components/TeamLogo.jsx';
import { useLogoDarkShare } from '@/shared/hooks/useLogoTone.js';
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
  // On the black side (dark mode), logos with black in them get help:
  //  - ESPN's dark-background logo, when the regular one has a real amount of near-black
  //    (Ohio State's lettering, Iowa's hawk) and the dark one has clearly less. Usually it's the
  //    same logo with white where the black was, so the school's colors stay.
  //  - Otherwise a mostly-black logo gets a thin light outline.
  // If logos can't be measured, a black/gray team color stands in for "black logo".
  const theme = useDocTheme(); // always called (hooks can't be conditional)
  const blackSide = !selected && theme !== 'light';
  const regular = useLogoDarkShare(blackSide ? team.logo : null);
  const alt = useLogoDarkShare(blackSide ? darkLogoUrl(team.logo) : null);
  const unknown = regular == null;
  const altBetter = blackSide && !unknown && regular > 0.1 && alt != null && alt < regular - 0.08;
  const mostlyBlack = blackSide && (unknown ? isBlackOrGray(team.color) : regular > 0.55);
  const onDark = (selected && ink === '#ffffff') || altBetter || (unknown && mostlyBlack);
  const outline = mostlyBlack && !altBetter && (unknown || alt == null || alt > 0.55);
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

