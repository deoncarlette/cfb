import { useEffect, useMemo, useState } from 'react';
import { formatKickoff } from '@/shared/utils/dates.js';
import { gameWinnerId } from '@/services/espn/index.js';
import { computeOverallStandings, SEASON_ROSTER } from '@/features/scoreboard/scoring.js';
import { DEFAULT_PLAYER } from '@/features/picks/sample/samplePicks.js';
import { useStoredState } from '@/shared/hooks/useStoredState.js';
import { swingGames } from './insightsLogic.js';

const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
const abbr = t => t.abbr || t.name;
const gapText = n => (n > 0 ? `up ${n}` : n < 0 ? `down ${-n}` : 'tied');

// "Swing games" on Insights: for one player, the locked games still to be decided that move
// them against the players right around them in the season standings — and which result helps.
export function SwingGames({ week, games, people }) {
  const [player, setPlayer] = useStoredState('insights-player', DEFAULT_PLAYER, 'local');
  const [prior, setPrior] = useState(null);
  useEffect(() => {
    let alive = true;
    if (typeof week !== 'number') { setPrior(null); return; }
    (week > 0 ? computeOverallStandings(week - 1) : Promise.resolve([]))
      .then(rows => alive && setPrior(new Map(rows.map(r => [r.user_name, Number(r.score) || 0]))))
      .catch(() => alive && setPrior(new Map()));
    return () => { alive = false; };
  }, [week]);

  // Season points so far: earlier weeks plus this week's finished games.
  const totals = useMemo(() => {
    if (!prior) return null;
    const t = new Map([...SEASON_ROSTER, ...people.map(p => p.name)].map(n => [n, prior.get(n) || 0]));
    games.forEach(g => {
      const w = gameWinnerId(g);
      if (!w) return;
      people.forEach(p => { const pick = p.picks[g.id]; if (pick?.winner === w) t.set(p.name, (t.get(p.name) || 0) + (Number(pick.confidence) || 0)); });
    });
    return t;
  }, [prior, games, people]);

  if (!totals || !games.some(g => !g.completed)) return null;
  const names = [...totals.keys()].sort((a, b) => a.localeCompare(b));
  const who = totals.has(player) ? player : names[0];
  const res = swingGames(games, people, totals, who);
  if (!res) return null;

  return (
    <section className="ins-section swing">
      <h3>Swing games</h3>
      <div className="swing-head">
        <select aria-label="Player" value={who} onChange={e => setPlayer(e.target.value)}>
          {names.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="muted small">{ordinal(res.rank)} with {res.score} pts{res.rivals.length ? ' · ' + res.rivals.map(r => `${gapText(r.gap)} on ${r.name}`).join(', ') : ''}</span>
      </div>
      {!res.games.length && <p className="muted small">No game left this week changes {who}'s spot against {res.rivals.map(r => r.name).join(' or ') || 'anyone'}.</p>}
      {res.games.slice(0, 6).map(s => <SwingRow key={s.game.id} s={s} who={who} />)}
      <p className="muted small swing-foot">Season points so far, counting this week's finished games. Rivals are the players right ahead of and behind {who}.</p>
    </section>
  );
}

function SwingRow({ s, who }) {
  const { game, vs, myPick, better, leader } = s;
  const [a, b] = game.competitors;
  const status = game.state === 'in'
    ? <span className="swing-live">{abbr(a)} {a.score}, {abbr(b)} {b.score} · {game.status}</span>
    : <span>{formatKickoff(game.date)}</span>;
  let headline = '';
  if (better) {
    headline = myPick && myPick.team.id !== better.id
      ? `Better for ${who} if ${abbr(better)} wins, even though ${who} picked ${abbr(myPick.team)}.`
      : myPick ? `${abbr(better)} winning (${who}'s pick, ${myPick.confidence} pts) helps most.`
      : `Better for ${who} if ${abbr(better)} wins.`;
  }
  let now = '';
  if (leader && better) now = leader.id === better.id ? `${abbr(leader)} leads right now, which helps.` : `${abbr(leader)} leads right now, which hurts.`;
  return (
    <div className={'ins-flag swing-row' + (leader && better ? (leader.id === better.id ? ' good' : ' bad') : '')}>
      <div><strong>{abbr(a)} vs {abbr(b)}</strong><span className="ins-tag">{status}</span></div>
      {headline && <p className="swing-headline">{headline}{now && ' ' + now}</p>}
      <ul className="swing-vs">
        {vs.map(v => (
          <li key={v.name}>
            <strong>{v.name}</strong> ({ordinal(v.rank)}{v.rivalPick ? `, picked ${abbr(v.rivalPick.team)} for ${v.rivalPick.confidence}` : ', no pick'}): now {gapText(v.gap)}.
            {' '}{abbr(a)} win → {gapText(v.after[a.id])}; {abbr(b)} win → {gapText(v.after[b.id])}.
          </li>
        ))}
      </ul>
    </div>
  );
}
