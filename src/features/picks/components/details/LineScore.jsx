// Points by quarter (plus OT if any) and the total.
export function LineScore({ away, home }) {
  const periods = Math.max(away.linescores.length, home.linescores.length, 4);
  const label = i => (i < 4 ? `Q${i + 1}` : i === 4 ? 'OT' : `${i - 3}OT`);
  const row = t => (
    <tr>
      <th scope="row">{t.abbr}</th>
      {Array.from({ length: periods }, (_, i) => <td key={i}>{t.linescores[i] ?? '–'}</td>)}
      <td className="total">{t.score ?? '–'}</td>
    </tr>
  );
  return (
    <section className="gd-section">
      <table className="linescore">
        <thead><tr><th />{Array.from({ length: periods }, (_, i) => <th key={i}>{label(i)}</th>)}<th>T</th></tr></thead>
        <tbody>{row(away)}{row(home)}</tbody>
      </table>
    </section>
  );
}
