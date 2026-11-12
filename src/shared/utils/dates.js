// Intl.DateTimeFormat uses the viewer's own browser/OS timezone when no explicit timeZone is
// passed, so this shows EDT/CDT/PST/etc. correctly per person with no manual detection.
// Example output: "SAT, 11/14 2:30 PM CST"
export function formatKickoff(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short'
  }).formatToParts(d);
  const get = type => parts.find(p => p.type === type)?.value || '';
  const weekday = get('weekday').toUpperCase().replace('.', '');
  return `${weekday}, ${get('month')}/${get('day')} ${get('hour')}:${get('minute')} ${get('dayPeriod')} ${get('timeZoneName')}`;
}

// ISO string → the "YYYY-MM-DDTHH:MM" format an <input type="datetime-local"> expects.
export function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isPast(iso) {
  return !!iso && Date.now() >= new Date(iso).getTime();
}
