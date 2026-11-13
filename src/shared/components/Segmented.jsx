// A row of mutually exclusive choices (the subtab-track look). options: [[value, label], ...]
export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="subtab-track" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v}
          className={'subtab-btn' + (value === v ? ' active' : '')} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}
