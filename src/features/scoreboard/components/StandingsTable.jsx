import { useStoredState } from '@/shared/hooks/useStoredState.js';
import { navigate } from '@/shared/nav.js';
import { RankMove } from './RankMove.jsx';
import { rankOf } from '../scoring.js';

// One table: rank, player, this week's points, season total, and movement since last week.
// Tap "Wk N" or "Total" to sort by it (remembered for this tab). Tap a name to see that
// player's picks for the week on the Picks tab (Back returns here). The rank follows the sort;
// ties share a rank. "—" = didn't play that week. Arrows (season movement) show on Total only.
export function StandingsTable({ week, weeklyRecords, overallRecords, priorRanks }) {
  const [sortBy, setSortBy] = useStoredState('scoreboard-sort', 'total', 'session');
  const weekly = new Map(weeklyRecords.map(r => [r.user_name, r]));
  // Didn't play: marked as not entered, or a 0 that isn't marked as entered.
  const satOut = w => !w || w.score === undefined || w.entered === false || (w.score === 0 && w.entered !== true);
  const weekScore = name => { const w = weekly.get(name); return satOut(w) ? -1 : Number(w.score) || 0; };

  const value = r => (sortBy === 'week' ? weekScore(r.user_name) : r.score);
  const sorted = [...overallRecords].sort((a, b) => value(b) - value(a) || b.score - a.score || a.user_name.localeCompare(b.user_name));
  const values = sorted.map(value);

  const SortHead = ({ id, children }) => (
    <th className="num-h" aria-sort={sortBy === id ? 'descending' : 'none'}>
      <button type="button" className={'sort-btn' + (sortBy === id ? ' active' : '')} onClick={() => setSortBy(id)}>
        {children}<span className="sort-caret" aria-hidden="true">▾</span>
      </button>
    </th>
  );

  return (
    <table className="board standings">
      <thead>
        <tr><th>Player</th><SortHead id="week">Wk {week}</SortHead><SortHead id="total">Total</SortHead><th aria-label="Movement"></th></tr>
      </thead>
      <tbody>
        {sorted.map(r => {
          const w = weekly.get(r.user_name);
          const sat = satOut(w);
          const rank = sortBy === 'week' && sat ? null : rankOf(value(r), values);
          return (
            <tr key={r.user_name}>
              <td>
                <span className="rank">{rank ?? '–'}</span>
                <button type="button" className="player-link" onClick={() => { navigate({ tab: 'picks', week, player: r.user_name }); window.scrollTo(0, 0); }}>{r.user_name}</button>
              </td>
              <td className={'num week-pts' + (sat ? ' sat-out' : '') + (sortBy === 'week' ? ' sorted' : '')}>{sat ? '—' : w.score}</td>
              <td className={'num' + (sortBy === 'total' ? ' sorted' : '')}>{r.score}</td>
              <td className="move-cell">{sortBy === 'total' && priorRanks && <RankMove prior={priorRanks.get(r.user_name)} rank={rank} />}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
