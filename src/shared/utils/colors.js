// ESPN sends team colors as bare hex ("bb0000"). Returns "#bb0000", or the fallback if the
// value is missing or malformed.
export function hexColor(value, fallback) {
  return value && /^[0-9a-f]{6}$/i.test(value) ? `#${value}` : fallback;
}

// Dark or light text, whichever reads better on top of a team-colored background.
export function textForBackground(hex) {
  const clean = (hex || '').replace('#', '');
  if (clean.length !== 6) return '#ffffff';
  const brightness = (parseInt(clean.slice(0, 2), 16) * 299 + parseInt(clean.slice(2, 4), 16) * 587 + parseInt(clean.slice(4, 6), 16) * 114) / 1000;
  return brightness > 150 ? '#242421' : '#ffffff';
}

// ---- Team colors on the black matchup pill ----

function toRgb(hex) {
  const c = (hex || '').replace('#', '');
  return c.length === 6 ? [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)) : null;
}
function toHex(rgb) { return '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join(''); }

// WCAG relative luminance, 0 (black) … 1 (white).
function luminance(hex) {
  const rgb = toRgb(hex); if (!rgb) return 0;
  const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function saturation(hex) {
  const rgb = toRgb(hex); if (!rgb) return 0;
  const max = Math.max(...rgb), min = Math.min(...rgb);
  return max === 0 ? 0 : (max - min) / max;
}
function mixWithWhite(hex, t) { return toHex(toRgb(hex).map(v => v + (255 - v) * t)); }
function lightenUntil(hex, minLum) {
  let out = hex;
  for (let t = 0.1; luminance(out) < minLum && t <= 1; t += 0.1) out = mixWithWhite(hex, t);
  return out;
}

// Black, near-black or gray: would disappear against the black pill.
function isDrab(hex) { return !toRgb(hex) || luminance(hex) < 0.03 || saturation(hex) < 0.15; }

// Fill for a PICKED team. Uses the team's main color unless it's black/gray/very dark, then
// its secondary color, then a lightened main color, then a light neutral.
export function teamFill(team) {
  if (!isDrab(team.color)) return team.color;
  if (team.altColor && !isDrab(team.altColor)) return team.altColor;
  if (toRgb(team.color) && saturation(team.color) >= 0.15) return lightenUntil(team.color, 0.06);
  return '#e8e9ec';
}

// Team-name color on the black pill (not picked). Needs enough contrast to read on black:
// main color if it's bright enough, else a bright secondary color, else the main color lightened.
export function teamTextOnDark(team) {
  const MIN = 0.15;
  if (toRgb(team.color) && luminance(team.color) >= MIN) return team.color;
  if (team.altColor && toRgb(team.altColor) && luminance(team.altColor) >= MIN && saturation(team.altColor) >= 0.15) return team.altColor;
  if (toRgb(team.color)) return lightenUntil(team.color, MIN);
  return '#e8e9ec';
}
