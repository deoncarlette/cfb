import { useElementWidth } from '@/shared/hooks/useElementWidth.js';
import { GAMES, ROUNDS, CHAMPIONSHIP_KEY, bowlFor } from '../bracketLogic.js';
import { Matchup } from './Matchup.jsx';
import { ChampionCard } from './ChampionCard.jsx';

// Where each game sits in the wide layout: four rows, one per quarterfinal. Each first-round
// game lines up with the quarterfinal it feeds; semis span their two quarterfinals and the
// title game spans all four.
const WIDE_ROWS = {
  r1b: '1', r1a: '2', r1c: '3', r1d: '4',
  qf1: '1', qf2: '2', qf3: '3', qf4: '4',
  sf1: '1 / span 2', sf2: '3 / span 2', nc: '1 / span 4'
};

// The whole bracket. With room (desktop, ≥ 760px of width): left-to-right rounds,
// R1 → QF → SF → Title. Narrower (phones, the Commish panel): one round per swipe.
//
// winners decides who advances on screen — a player's picks, or the real results in the
// Commissioner panel. statusFor(gameKey) optionally marks right/wrong picks.
// bowls is the commissioner's { gameKey: bowlId } assignment, shown above each game.
export function BracketView({ seeds, winners, onPick, statusFor, locked, bowls }) {
  const [ref, width] = useElementWidth();
  const wide = width >= 760;
  const bySeed = Object.fromEntries(seeds.map(t => [t.seed, t]));
  const teamById = Object.fromEntries(seeds.map(t => [t.id, t]));
  const shared = { bySeed, teamById, winners, statusFor, onPick, locked, bowls };
  const champion = winners[CHAMPIONSHIP_KEY] ? teamById[winners[CHAMPIONSHIP_KEY]] : null;

  const head = r => (
    <div className="bk-col-head">
      <span>{r.label}</span>
      <span className="bk-col-when">{r.when}</span>
    </div>
  );

  if (wide) {
    return (
      <div ref={ref} className={'bk-grid wide' + (width >= 1000 ? ' roomy' : '')}>
        {ROUNDS.map((r, i) => <div key={r.id} className="bk-head-cell" style={{ gridColumn: i + 1 }}>{head(r)}</div>)}
        {GAMES.map(g => {
          const col = ROUNDS.findIndex(r => r.id === g.round) + 1;
          return (
            <div key={g.key} className={`bk-cell bk-${g.round}`} style={{ gridColumn: col, gridRow: bumpRow(WIDE_ROWS[g.key]) }}>
              <Matchup gameKey={g.key} {...shared} />
              {g.key === CHAMPIONSHIP_KEY && <ChampionCard team={champion} />}
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div ref={ref} className="bk-grid narrow">
      {ROUNDS.map(r => (
        <div className={`bk-col bk-${r.id}`} key={r.id}>
          {head(r)}
          <div className="bk-col-body">
            {GAMES.filter(g => g.round === r.id).map(g => <Matchup key={g.key} gameKey={g.key} {...shared} />)}
            {r.id === 'nc' && <ChampionCard team={champion} />}
          </div>
        </div>
      ))}
    </div>
  );
}

// Row 1 of the wide grid holds the round headers, so games start at row 2.
function bumpRow(spec) {
  const [start, rest] = spec.split(' / ');
  return `${Number(start) + 1}${rest ? ' / ' + rest : ''}`;
}


