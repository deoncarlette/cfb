// Away value | label | home value, one row per stat — mirrors the pill (away left, home right).
// rows: [{ label, away, home }] (values can be text or elements; null shows as —)
export function CompareRows({ title, rows }) {
  if (!rows.length) return null;
  return (
    <section className="gd-section">
      {title && <h4>{title}</h4>}
      <div className="compare">
        {rows.map(r => (
          <div className="compare-row" key={r.label}>
            <span className="cv away">{r.away ?? '—'}</span>
            <span className="cl">{r.label}</span>
            <span className="cv home">{r.home ?? '—'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
