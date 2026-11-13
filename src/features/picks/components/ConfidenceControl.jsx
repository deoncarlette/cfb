// Right side of a game card.
// Before lock: the point value (type a number to jump there) with ↑/↓ under it.
// Game final: your confidence, filled green if the pick won and red if it lost.
// Live: your confidence, tinted by whether your team is ahead.
// Locked but not started: just your confidence.
// Missed (locked with no pick): the burned point value in gray.
// chip: one compact piece for the seam of the whole-card layout — ↑ / points / ↓ stacked
// while editable, just the colored number otherwise (its state is in the color and label).
export function ConfidenceControl({ points, max, canUp, canDown, locked, result, live, missed, chip, onSetPoints, onUp, onDown }) {
  if (chip) {
    if (missed) return <span className="pts-chip"><span className="pts-badge missed" aria-label={`${points} points missed`}>{points}</span></span>;
    if (result) return <span className="pts-chip"><span className={'pts-badge ' + (result.correct ? 'right' : 'wrong')} aria-label={`${result.of} points ${result.correct ? 'won' : 'lost'}`}>{result.of}</span></span>;
    if (live) return <span className="pts-chip"><span className={'pts-badge live-' + live} aria-label={`${points} points, ${live}`}>{points}</span></span>;
    if (locked) return <span className="pts-chip"><span className="pts-badge">{points}</span></span>;
    return (
      <span className="pts-chip editable">
        <button type="button" aria-label="Move up" onClick={onUp} disabled={!canUp}>&#9652;</button>
        <input type="number" className="pts-input" aria-label="Confidence points" min={1} max={max} value={points} onChange={e => onSetPoints(Number(e.target.value))} />
        <button type="button" aria-label="Move down" onClick={onDown} disabled={!canDown}>&#9662;</button>
      </span>
    );
  }
  if (missed) {
    return (
      <>
        <span className="pts-badge missed" aria-label={`${points} points missed, not picked before kickoff`}>{points}</span>
        <span className="pts-of">missed</span>
      </>
    );
  }
  if (result) {
    return (
      <>
        <span className={'pts-badge ' + (result.correct ? 'right' : 'wrong')} aria-label={`${result.of} points ${result.correct ? 'won' : 'lost'}`}>{result.of}</span>
        <span className="pts-of">{result.correct ? 'won' : 'lost'}</span>
      </>
    );
  }
  // Live: green while your team leads, red while it trails.
  if (live) {
    return (
      <>
        <span className={'pts-badge live-' + live} aria-label={`${points} points, your team is ${live}`}>{points}</span>
        <span className="pts-of">{live}</span>
      </>
    );
  }
  if (locked) return <span className="pts-badge">{points}</span>;
  return (
    <>
      <input
        type="number"
        className="pts-input"
        aria-label="Confidence points"
        min={1}
        max={max}
        value={points}
        onChange={e => onSetPoints(Number(e.target.value))}
      />
      <span className="arrows">
        <button type="button" aria-label="Move up" onClick={onUp} disabled={!canUp}>&uarr;</button>
        <button type="button" aria-label="Move down" onClick={onDown} disabled={!canDown}>&darr;</button>
      </span>
    </>
  );
}
