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
// True black or gray (no real hue) — would disappear on, or look the same as, the black pill.
// Dark colors with a real hue (Michigan navy, Mississippi State maroon) are NOT gray.
function isBlackOrGray(hex) { return !toRgb(hex) || saturation(hex) < 0.15 || luminance(hex) < 0.006; }

// Fill for a PICKED team: always the team's main color, unless it's black or gray — then its
// secondary color, so the pick still stands out from the black pill.
export function teamFill(team) {
  if (!isBlackOrGray(team.color)) return team.color;
  if (team.altColor && toRgb(team.altColor) && luminance(team.altColor) >= 0.02) return team.altColor;
  return '#e8e9ec';
}

