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
