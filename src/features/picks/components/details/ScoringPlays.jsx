// Every score in order: quarter, clock, which team, what happened, and the score after it.
export function ScoringPlays({ plays, away, home }) {
  if (!plays.length) return null;
  return (
    <section className="gd-section">
      <h4>Scoring</h4>
      <ol className="scoring">
        {plays.map((p, i) => (
          <li key={i}>
            <span className="sp-when">Q{p.period} {p.clock}</span>
            <span className="sp-team">{p.teamId === away.id ? away.abbr : p.teamId === home.id ? home.abbr : ''}</span>
            <span className="sp-text">{p.text}</span>
            <span className="sp-score">{p.away}–{p.home}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
