// "View picks for" dropdown on locked weeks: your own picks, or any other player's.
// Label above a full-width select, like the Week field.
export function PlayerPicker({ value, players, selfLabel, onChange }) {
  return (
    <div className="player-picker">
      <label htmlFor="picks-shown">View picks for</label>
      <select id="picks-shown" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{selfLabel}</option>
        {players.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  );
}
