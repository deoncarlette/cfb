// The point value on the right of a game card (type a number to jump there) and the ↑/↓
// arrows under it. Rendered as two pieces that GameCard's grid places.
export function ConfidenceControl({ points, max, canUp, canDown, disabled, onSetPoints, onUp, onDown }) {
  return (
    <>
      <input
        type="number"
        className="pts-input"
        aria-label="Confidence points"
        min={1}
        max={max}
        value={points}
        disabled={disabled}
        onChange={e => onSetPoints(Number(e.target.value))}
      />
      <span className="arrows">
        <button type="button" aria-label="Move up" onClick={onUp} disabled={!canUp || disabled}>&uarr;</button>
        <button type="button" aria-label="Move down" onClick={onDown} disabled={!canDown || disabled}>&darr;</button>
      </span>
    </>
  );
}
