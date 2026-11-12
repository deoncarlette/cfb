// A team's logo. Falls back to a team-colored circle with the first letter if ESPN has none.
// size="big" for the Champion card.
export function TeamLogo({ team, size, title, alt = '' }) {
  const cls = 'team-logo' + (size === 'big' ? ' big' : '') + (team.logo ? '' : ' fallback');
  return (
    <span className={cls} style={{ '--team': team.color }} title={title}>
      {team.logo ? <img src={team.logo} alt={alt} /> : (team.abbr || team.name || '?').slice(0, 1)}
    </span>
  );
}
