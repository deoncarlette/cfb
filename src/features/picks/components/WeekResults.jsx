// Summary once games start going final: points earned, record, and the most you can still get.
export function WeekResults({ totals }) {
  const allDone = totals.maxPossible === totals.earned;
  return (
    <div className="week-results">
      <div><strong>{totals.earned}</strong><span>points</span></div>
      <div><strong>{totals.right}–{totals.wrong}</strong><span>record</span></div>
      <div><strong>{allDone ? totals.total : totals.maxPossible}</strong><span>{allDone ? 'possible' : 'max possible'}</span></div>
    </div>
  );
}
