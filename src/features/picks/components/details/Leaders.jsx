// Top passer / rusher / receiver for each team (season leaders before kickoff, game leaders after).
export function Leaders({ leaders, started }) {
  if (!leaders.length) return null;
  const cell = l => (l ? <><strong>{l.player}</strong><small>{l.value}</small></> : '—');
  return (
    <section className="gd-section">
      <h4>{started ? 'Game leaders' : 'Season leaders'}</h4>
      <div className="compare">
        {leaders.map(l => (
          <div className="compare-row leaders-row" key={l.label}>
            <span className="cv away">{cell(l.away)}</span>
            <span className="cl">{l.label.replace(' Yards', '')}</span>
            <span className="cv home">{cell(l.home)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
