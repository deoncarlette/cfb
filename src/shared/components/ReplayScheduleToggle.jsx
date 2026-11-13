import { replaySchedule, setReplaySchedule } from '@/services/espn/replay.js';

// Test replay only: real kickoff times only, or also a live preview 12 hours away.
// Switching reloads, so every screen (picks, scoreboard) uses the same schedule.
export function ReplayScheduleToggle() {
  const current = replaySchedule();
  const choose = value => { if (value !== current) { setReplaySchedule(value); window.location.reload(); } };
  return (
    <div className="replay-toggle" role="radiogroup" aria-label="Replay schedule">
      {[['real', 'Real times only'], ['twice', 'Add live previews']].map(([value, label]) => (
        <button key={value} type="button" role="radio" aria-checked={current === value}
          className={'replay-opt' + (current === value ? ' active' : '')} onClick={() => choose(value)}>
          {label}
        </button>
      ))}
    </div>
  );
}
