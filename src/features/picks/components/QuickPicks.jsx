export function QuickPicks({ onPick, disabled }) {
  return (
    <div className="row-gap quickpicks">
      <button type="button" onClick={() => onPick('random')} disabled={disabled}>Random</button>
      <button type="button" onClick={() => onPick('home')} disabled={disabled}>All home</button>
      <button type="button" onClick={() => onPick('away')} disabled={disabled}>All away</button>
    </div>
  );
}
