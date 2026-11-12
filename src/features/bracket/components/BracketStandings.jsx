import { CHAMPIONSHIP_KEY, rankBrackets } from '../bracketLogic.js';
import { TeamLogo } from '@/shared/components/TeamLogo.jsx';

// Before lock: just who's submitted (picks stay hidden). After lock: points, max possible,
// and each player's champion; tap a row to open their bracket.
export function BracketStandings({ entries, results, bySeed, seeds, locked, championshipTotal, onOpen }) {
  if (!entries.length) return <p className="muted small">No brackets submitted yet.</p>;

  if (!locked) {
    return (
      <table className="board">
        <thead><tr><th>Player</th><th></th></tr></thead>
        <tbody>
          {[...entries].sort((a, b) => a.user_name.localeCompare(b.user_name)).map(e => (
            <tr key={e.id}><td>{e.user_name}</td><td className="num">Submitted</td></tr>
          ))}
        </tbody>
      </table>
    );
  }

  const teamById = Object.fromEntries(seeds.map(t => [t.id, t]));
  const rows = rankBrackets(entries, results, bySeed, championshipTotal);
  return (
    <table className="board">
      <thead><tr><th>Player</th><th>Champ</th><th className="num-h">Max</th><th className="num-h">Pts</th></tr></thead>
      <tbody>
        {rows.map((r, i) => {
          const champ = teamById[r.picks?.[CHAMPIONSHIP_KEY]];
          return (
            <tr key={r.id} className="clickable" onClick={() => onOpen(r)}>
              <td>{i + 1}. {r.user_name}</td>
              <td className="bk-champ-cell">{champ && <TeamLogo team={champ} title={champ.name} alt={champ.name} />}</td>
              <td className="num muted-num">{r.possible}</td>
              <td className="num">{r.score}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
