import { useEffect, useMemo, useState } from 'react';
import { useWeekSelector } from '@/shared/hooks/useWeekSelector.js';
import { WeekSelect } from '@/shared/components/WeekSelect.jsx';
import { formatKickoff } from '@/shared/utils/dates.js';
import { navigate } from '@/shared/nav.js';
import { usePicksWeek } from '@/features/picks/hooks/usePicksWeek.js';
import { useOtherPlayers } from '@/features/picks/hooks/useOtherPlayers.js';
import { sampleFileWeeks } from '@/features/picks/sample/samplePicks.js';
import { weekInsights, agreementHistory } from './insightsLogic.js';
import { PoolPicks } from '@/features/picks/components/details/PoolPicks.jsx';

// Insights tab: how the pool picked a week, from LOCKED games only (open picks stay
// private, same rule as everywhere else).
export function InsightsPanel() {
  const { week, setWeek, weeks } = useWeekSelector(1);
  const { games, sample, lock, loading } = usePicksWeek(week);
  const others = useOtherPlayers(week, lock.anyLocked, sample);
  const [fileWeeks, setFileWeeks] = useState(null);
  useEffect(() => { sampleFileWeeks().then(setFileWeeks).catch(() => setFileWeeks([])); }, []);

  const lockedGames = games.filter(g => lock.lockedIds.has(g.id));
  const people = others.players.map(name => ({ name, picks: others.entryFor(name)?.picks || {} }))
    .filter(p => lockedGames.some(g => p.picks[g.id]));
  const history = useMemo(() => (fileWeeks && typeof week === 'number' ? agreementHistory(fileWeeks, week) : null), [fileWeeks, week]);
  const ins = lockedGames.length && people.length ? weekInsights(lockedGames, people, history) : null;
  const label = typeof week === 'number' ? `Week ${week}` : 'the postseason';

  return (
    <div className="panel insights">
      <h2>Insights</h2>
      <p className="muted small">How the pool picked, from games that have locked. Picks on open games stay private.</p>
      <WeekSelect week={week} weeks={weeks} onChange={setWeek} />

      {loading && <p className="muted small">Loading…</p>}
      {!loading && !lockedGames.length && (
        <p className="sample-note">Nothing has locked for {label} yet{lock.lockAt ? `. First lock: ${formatKickoff(lock.lockAt)}.` : '.'}</p>
      )}
      {!loading && lockedGames.length > 0 && !ins && <p className="sample-note">No picks on {label}'s locked games yet.</p>}

      {ins && (
        <>
          <p className="ins-summary">
            {ins.games} locked {ins.games === 1 ? 'game' : 'games'}, {ins.players} players.
            {ins.unanimous > 0 && ` ${ins.unanimous} unanimous ${ins.unanimous === 1 ? 'pick' : 'picks'}.`}
          </p>

          <Section title="Players to watch" empty="No one stands out yet.">
            {ins.flags.map((f, i) => (
              <div key={i} className={'ins-flag ' + f.kind}>
                <div><button type="button" className="ins-name" onClick={() => openPicks(week, f.name)}>{f.name}</button><span className="ins-tag">{f.title}</span></div>
                <p>{f.text}</p>
              </div>
            ))}
          </Section>

          <Section title="Pool agrees" empty="No game has 75% or more on one side.">
            {ins.consensus.map(g => <GameRow key={g.game.id} g={g} people={people} />)}
          </Section>

          <Section title="Split decisions">
            {ins.splits.map(g => <GameRow key={g.game.id} g={g} people={people} />)}
          </Section>

          {ins.burned.length > 0 && (
            <Section title="Pool got burned">
              {ins.burned.map(g => <GameRow key={g.game.id} g={g} people={people} burned />)}
            </Section>
          )}

          <Section title="Everyone's picks">
            <div className="ins-people">
              {people.map(p => <button key={p.name} type="button" className="ins-person" onClick={() => openPicks(week, p.name)}>{p.name}</button>)}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

const openPicks = (week, player) => { navigate({ tab: 'picks', week, player }); window.scrollTo(0, 0); };

function Section({ title, empty, children }) {
  const has = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <section className="ins-section">
      <h3>{title}</h3>
      {has ? children : empty && <p className="muted small">{empty}</p>}
    </section>
  );
}

// One game: who's on each side (count and points), with the result once final. Tap it to see
// where everyone lines up (the same Pool picks view as the game panel on Picks).
function GameRow({ g, people, burned }) {
  const [open, setOpen] = useState(false);
  const [a, b] = g.sides;
  const pool = people.map(p => ({ name: p.name, winner: p.picks[g.game.id]?.winner ?? null, confidence: Number(p.picks[g.game.id]?.confidence) || 0, isYou: false }));
  const name = t => t.team.abbr || t.team.name;
  const result = g.winner ? (burned ? `${name(g.sides.find(s => s.team.id === g.winner))} won` : `Final`) : g.game.state === 'in' ? 'Live' : '';
  return (
    <div className={'ins-game' + (open ? ' open' : '')}>
      <button type="button" className="ins-game-btn" aria-expanded={open} onClick={() => setOpen(o => !o)}>
      <div className="ins-game-head"><strong>{name(a)} vs {name(b)}</strong><span className="ins-right">{result && <span className={'ins-result' + (burned ? ' burned' : '')}>{result}</span>}<span className="chev" aria-hidden="true" /></span></div>
      {a.n && b.n ? (
        <div className="ins-split">
          <span>{name(a)}: {a.n} {a.n === 1 ? 'player' : 'players'}, {a.points} pts</span>
          <span>{name(b)}: {b.n} {b.n === 1 ? 'player' : 'players'}, {b.points} pts</span>
        </div>
      ) : (
        <div className="ins-split"><span>Everyone on {name(a.n ? a : b)}, {(a.n ? a : b).points} pts</span></div>
      )}
      <div className="wp-bar ins-bar">
        {a.n > 0 && <span style={{ width: `${(a.n / g.n) * 100}%`, background: a.team.color }} />}
        {b.n > 0 && <span style={{ width: `${(b.n / g.n) * 100}%`, background: b.team.color }} />}
      </div>
      </button>
      {open && <div className="ins-pool"><PoolPicks game={g.game} pool={pool} compact /></div>}
    </div>
  );
}
