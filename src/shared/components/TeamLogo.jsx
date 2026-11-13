import { useState } from 'react';

// ESPN publishes a second version of each logo made for dark backgrounds (500-dark): schools
// whose logo is the same dark color as their team color (Mississippi State, Duke) get a
// white or outlined version there. For most schools it's the same image.
export function darkLogoUrl(url) {
  return url && url.includes('/teamlogos/') && url.includes('/500/') ? url.replace('/500/', '/500-dark/') : '';
}

// A team's logo. Falls back to a team-colored circle with the first letter if ESPN has none.
// size="big" for the Champion card. onDark: the logo sits on black or a dark team color, so use
// ESPN's dark-background version (falls back to the regular logo if there isn't one).
// outline: a thin light edge around the logo's shape, for black logos on the black pill.
export function TeamLogo({ team, size, title, alt = '', onDark = false, outline = false }) {
  const dark = onDark ? darkLogoUrl(team.logo) : '';
  const [failed, setFailed] = useState('');
  const src = dark && failed !== dark ? dark : team.logo;
  const cls = 'team-logo' + (size === 'big' ? ' big' : '') + (team.logo ? '' : ' fallback') + (outline ? ' outline' : '');
  return (
    <span className={cls} style={{ '--team': team.color }} title={title}>
      {team.logo ? <img src={src} alt={alt} onError={() => dark && setFailed(dark)} /> : (team.abbr || team.name || '?').slice(0, 1)}
    </span>
  );
}
