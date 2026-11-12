import { RankMove } from './RankMove.jsx';

export function StandingsTable({ records, priorRanks }) {
  const hasScores = records.every(r => r.score !== undefined);
  const sorted = [...records].sort((a, b) => hasScores ? (b.score - a.score) : a.user_name.localeCompare(b.user_name));
  return (
    <table className="board">
      <thead><tr><th>Player</th><th></th><th></th></tr></thead>
      <tbody>
        {sorted.map((r, i) => {
          const rank = i + 1;
          return (
            <tr key={r.user_name}>
              <td>{rank}. {r.user_name}</td>
              <td>{priorRanks && <RankMove prior={priorRanks.get(r.user_name)} rank={rank} />}</td>
              <td className="num">{r.score !== undefined ? `${r.score} pts` : (r.submitted ? 'Submitted' : 'Not yet')}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
