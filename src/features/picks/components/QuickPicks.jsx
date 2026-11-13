// Fill in every open game at once (or clear them). Games that have locked aren't touched.
// Favorites come from the betting line; games without one use the better-ranked team, then home.
const OPTIONS = [
  ['favorites', 'All favorites'], ['underdogs', 'All underdogs'], ['random', 'Random'],
  ['home', 'All home'], ['away', 'All away'], ['clear', 'Clear all']
];

export function QuickPicks({ onPick, disabled }) {
  return (
    <div className="quickpicks">
      {OPTIONS.map(([mode, label]) => (
        <button key={mode} type="button" className={mode === 'clear' ? 'qp-clear' : ''} onClick={() => onPick(mode)} disabled={disabled}>{label}</button>
      ))}
    </div>
  );
}
