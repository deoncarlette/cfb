// Summary once games start going final: record, points earned, and the points still riding on
// games that aren't final ("still in play"). When every game is final, the last tile becomes
// the week's total points on the board ("possible").
export function WeekResults({ totals }) {
  const inPlay = totals.maxPossible - totals.earned;
  const allDone = inPlay === 0;
  return (
    <div className="week-results">
      <div><strong>{totals.right}–{totals.wrong}</strong><span>record</span></div>
      <div><strong>{totals.earned}</strong><span>points</span></div>
      <div><strong>{allDone ? totals.total : inPlay}</strong><span>{allDone ? 'possible' : 'still in play'}</span></div>
    </div>
  );
}
