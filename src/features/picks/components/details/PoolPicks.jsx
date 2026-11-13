import { teamFill } from '@/shared/utils/colors.js';
import { gameWinnerId } from '@/services/espn/index.js';

// How the pool picked this game (shown once the game locks): a split bar of players on each
// team in the team colors, the confidence points riding on each side, and who picked whom
// with their points, highest first. Your name is highlighted. Final: the winning side turns
// green, the losing side red; live: which side is ahead.
// pool: [{ name, winner (team id) | null, confidence, isYou }]
export function PoolPicks({ game, pool }) {
  const [away, home] = game.competitors;
  const sides = [away, home].map(team => {
    const rows = pool.filter(p => p.winner === team.id).sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));
    return { team, rows, points: rows.reduce((t, r) => t + (Number(r.confidence) || 0), 0) };
  });
  const picked = sides[0].rows.length + sides[1].rows.length;
  if (!picked) return null;
  const satOut = pool.length - picked;
  const pct = n => Math.round((n / picked) * 100);

  const winner = gameWinnerId(game);
  const live = game.state === 'in' && away.score != null && home.score != null && Number(away.score) !== Number(home.score)
    ? (Number(away.score) > Number(home.score) ? away.id : home.id) : null;
  const status = team => winner ? (winner === team.id ? 'won' : 'lost') : live ? (live === team.id ? 'ahead' : 'behind') : '';

  return (
    <section className="gd-section pool">
      <h4>Pool picks</h4>
      <div className="wp-labels">
        <strong>{sides[0].rows.length} ({pct(sides[0].rows.length)}%)</strong>
        <strong>{sides[1].rows.length} ({pct(sides[1].rows.length)}%)</strong>
      </div>
      <div className="wp-bar">
        {sides.map(s => s.rows.length > 0 && <span key={s.team.id} style={{ width: `${pct(s.rows.length)}%`, background: teamFill(s.team) }} />)}
      </div>
      <div className="pool-points"><span>{sides[0].points}</span><small>points riding</small><span>{sides[1].points}</span></div>
      <div className="pool-cols">
        {sides.map((s, i) => (
          <div key={s.team.id} className={'pool-col ' + (i ? 'home ' : 'away ') + status(s.team)}>
            <div className="pool-col-head">{s.team.abbr || s.team.name}{status(s.team) && <em>{status(s.team)}</em>}</div>
            {s.rows.map(r => (
              <div key={r.name} className={'pool-row' + (r.isYou ? ' you' : '')}>
                <span>{r.name}</span><strong>{r.confidence}</strong>
              </div>
            ))}
            {!s.rows.length && <div className="pool-row empty">No one</div>}
          </div>
        ))}
      </div>
      {satOut > 0 && <p className="pool-note">{satOut} {satOut === 1 ? 'player' : 'players'} didn't pick this game.</p>}
    </section>
  );
}
