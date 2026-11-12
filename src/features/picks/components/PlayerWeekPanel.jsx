import { WeekSelect } from '@/shared/components/WeekSelect.jsx';

// Top panel: your name and which week.
export function PlayerWeekPanel({ userName, onNameChange, onNameBlur, week, weeks, onWeekChange }) {
  return (
    <div className="panel">
      <label>Your name</label>
      <input value={userName} onChange={e => onNameChange(e.target.value)} onBlur={onNameBlur} placeholder="Type your name" />
      <label>Week</label>
      <WeekSelect week={week} weeks={weeks} onChange={onWeekChange} />
    </div>
  );
}
