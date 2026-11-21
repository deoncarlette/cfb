// Summary once games start going final: record, points earned, and the points still riding on
// games that aren't final ("still in play"). When every game is final, the last tile becomes
// the week's total points on the board ("possible").
// season: the player's season before this week ({ right, wrong, points }); this week's results
// are added on so the second row reads "season so far".
export function WeekResults({ totals, season, showWeek = true }) {
  const inPlay = totals.maxPossible - totals.earned;
  const allDone = inPlay === 0 && !totals.noPicks;
  return (
    <>
      {showWeek && (
        <div className="week-results">
          <div><strong>{totals.right}–{totals.wrong}</strong><span>record</span></div>
          <div><strong>{totals.earned}</strong><span>points</span></div>
          <div><strong>{allDone ? totals.total : inPlay}</strong><span>{allDone ? 'possible' : 'still in play'}</span></div>
        </div>
      )}
      {season && (
        <div className="season-results">
          <div><strong>{season.right + totals.right}–{season.wrong + totals.wrong}</strong><span>season record</span></div>
          <div><strong>{(season.points + totals.earned).toLocaleString()}</strong><span>season points</span></div>
        </div>
      )}
    </>
  );
}
