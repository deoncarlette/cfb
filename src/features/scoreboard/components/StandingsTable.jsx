import { RankMove } from './RankMove.jsx';
import { rankOf } from '../scoring.js';

// One table: rank, player, this week's points, season total, and movement since last week.
// Sorted by season total; ties share a rank. "—" = didn't play that week.
export function StandingsTable({ week, weeklyRecords, overallRecords, priorRanks }) {
  const weekly = new Map(weeklyRecords.map(r => [r.user_name, r]));
  const sorted = [...overallRecords].sort((a, b) => b.score - a.score || a.user_name.localeCompare(b.user_name));
  const totals = sorted.map(r => r.score);
  return (
    <table className="board standings">
      <thead>
        <tr><th>Player</th><th className="num-h">Wk {week}</th><th className="num-h">Total</th><th aria-label="Movement"></th></tr>
      </thead>
      <tbody>
        {sorted.map(r => {
          const w = weekly.get(r.user_name);
          // Didn't play: marked as not entered, or a 0 that isn't marked as entered.
          const sat = !w || w.score === undefined || w.entered === false || (w.score === 0 && w.entered !== true);
          const rank = rankOf(r.score, totals);
          return (
            <tr key={r.user_name}>
              <td><span className="rank">{rank}</span>{r.user_name}</td>
              <td className={'num week-pts' + (sat ? ' sat-out' : '')}>{sat ? '—' : w.score}</td>
              <td className="num">{r.score}</td>
              <td className="move-cell">{priorRanks && <RankMove prior={priorRanks.get(r.user_name)} rank={rank} />}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
