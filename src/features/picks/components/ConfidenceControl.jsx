// Right side of a game card.
// Before lock: the point value (type a number to jump there) with ↑/↓ under it.
// Game final: the points you earned (your confidence if right, 0 if wrong) and "of N".
// Locked but not final: just your confidence.
export function ConfidenceControl({ points, max, canUp, canDown, locked, result, onSetPoints, onUp, onDown }) {
  if (result) {
    return (
      <>
        <span className={'pts-badge ' + (result.correct ? 'right' : 'wrong')} aria-label={`${result.earned} of ${result.of} points`}>{result.earned}</span>
        <span className="pts-of">of {result.of}</span>
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
