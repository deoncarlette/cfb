// Round team-colored badge with the team's logo inside. size="big" for the Champion card.
export function TeamLogo({ team, size, title, alt = '' }) {
  return (
    <span className={'team-logo-swatch' + (size === 'big' ? ' big' : '')} style={{ '--swatch-color': team.color }} title={title}>
      {team.logo && <img src={team.logo} alt={alt} />}
    </span>
  );
}
