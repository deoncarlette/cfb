// "Picks shown" dropdown on locked weeks: your own picks, or any other player's.
export function PlayerPicker({ value, players, selfLabel, onChange }) {
  return (
    <div className="player-picker">
      <label htmlFor="picks-shown">Picks shown</label>
      <select id="picks-shown" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{selfLabel}</option>
        {players.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  );
}
