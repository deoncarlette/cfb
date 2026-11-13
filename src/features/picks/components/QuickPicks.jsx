// Fill in every open game at once (or clear them), from one dropdown. Choosing an option applies
// it and the menu goes back to its prompt. Games that have locked aren't touched.
// Favorites come from the betting line; games without one use the better-ranked team, then home.
const OPTIONS = [
  ['random', 'Random'], ['home', 'All home'], ['away', 'All away'],
  ['favorites', 'All favorites'], ['underdogs', 'All underdogs'], ['clear', 'Clear all picks']
];

export function QuickPicks({ onPick, disabled }) {
  return (
    <div className="quickpicks">
      <label htmlFor="quick-picks">Quick picks</label>
      <select id="quick-picks" value="" disabled={disabled} onChange={e => { if (e.target.value) onPick(e.target.value); }}>
        <option value="" disabled>Fill in every game…</option>
        {OPTIONS.map(([mode, label]) => <option key={mode} value={mode}>{label}</option>)}
      </select>
    </div>
  );
}
