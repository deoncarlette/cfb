import { POSTSEASON } from '@/services/espn/index.js';

export const weekLabel = w => (w === POSTSEASON ? 'Postseason' : `Week ${w}`);

export function WeekSelect({ week, weeks, onChange }) {
  return (
    <select value={week} onChange={e => onChange(e.target.value === POSTSEASON ? POSTSEASON : Number(e.target.value))}>
      {weeks.map(w => <option key={w} value={w}>{weekLabel(w)}</option>)}
    </select>
  );
}
