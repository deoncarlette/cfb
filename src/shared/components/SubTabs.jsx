// Pill-style toggle inside a panel, e.g. Weekly / Overall or My bracket / Standings.
// options: [{ id, label }]
export function SubTabs({ options, value, onChange }) {
  return (
    <div className="subtab-track">
      {options.map(o => (
        <button key={o.id} className={'subtab-btn' + (value === o.id ? ' active' : '')} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}
