export function StandingsTable({ records, priorRanks }) {
  const hasScores = records.every(r => r.score !== undefined);
  const sorted = [...records].sort((a, b) => hasScores ? (b.score - a.score) : a.user_name.localeCompare(b.user_name));
  return (
    <table className="board">
      <thead><tr><th>Player</th><th></th><th></th></tr></thead>
      <tbody>
        {sorted.map((r, i) => {
          const rank = i + 1;
          const prior = priorRanks?.get(r.user_name);
          let moveEl = null;
          if (priorRanks) {
            if (prior === undefined) moveEl = <span className="move new">NEW</span>;
            else {
              const delta = prior - rank;
              moveEl = delta > 0 ? <span className="move up">&#9650;{delta}</span>
                : delta < 0 ? <span className="move down">&#9660;{Math.abs(delta)}</span>
                : <span className="move same">&ndash;</span>;
            }
          }
          return (
            <tr key={r.user_name}>
              <td>{rank}. {r.user_name}</td>
              <td>{moveEl}</td>
              <td className="num">{r.score !== undefined ? `${r.score} pts` : (r.submitted ? 'Submitted' : 'Not yet')}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
