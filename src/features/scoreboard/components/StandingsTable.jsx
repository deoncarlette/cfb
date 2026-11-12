import { RankMove } from './RankMove.jsx';
import { rankOf } from '../scoring.js';

// One table for both views. Ties share a rank. Players who didn't play that week show "—".
export function StandingsTable({ records, priorRanks }) {
  const hasScores = records.every(r => r.score !== undefined);
  const sorted = [...records].sort((a, b) => hasScores ? (b.score - a.score || a.user_name.localeCompare(b.user_name)) : a.user_name.localeCompare(b.user_name));
  const scores = sorted.map(r => r.score ?? -1);
  return (
    <table className="board">
      <thead><tr><th>Player</th><th></th><th className="num-h">Pts</th></tr></thead>
      <tbody>
        {sorted.map(r => {
          const sat = r.entered === false;
          const rank = rankOf(r.score ?? -1, scores);
          return (
            <tr key={r.user_name} className={sat ? 'sat-out' : undefined}>
              <td><span className="rank">{hasScores && !sat ? rank : ''}</span>{r.user_name}</td>
              <td>{priorRanks && <RankMove prior={priorRanks.get(r.user_name)} rank={rank} />}</td>
              <td className="num">{r.score === undefined ? (r.submitted ? 'Submitted' : 'Not yet') : sat ? '—' : r.score}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
