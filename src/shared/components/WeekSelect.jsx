export function WeekSelect({ week, weeks, onChange }) {
  return (
    <select value={week} onChange={e => onChange(Number(e.target.value))}>
      {weeks.map(w => <option key={w} value={w}>Week {w}</option>)}
    </select>
  );
}
