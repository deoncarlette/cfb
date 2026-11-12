// Right side of a game card: the point value (type to jump) plus ↑/↓ arrows.
export function ConfidenceControl({ points, max, canUp, canDown, disabled, onSetPoints, onUp, onDown }) {
  return (
    <div className="combo-side">
      <input
        type="number"
        className="pts-input"
        min={1}
        max={max}
        value={points}
        disabled={disabled}
        onChange={e => onSetPoints(Number(e.target.value))}
      />
      <span className="arrows">
        <button type="button" onClick={onUp} disabled={!canUp || disabled}>&uarr;</button>
        <button type="button" onClick={onDown} disabled={!canDown || disabled}>&darr;</button>
      </span>
    </div>
  );
}
