import { useMediaQuery } from '@/shared/hooks/useMediaQuery.js';
import { GAMES, ROUNDS, CHAMPIONSHIP_KEY } from '../bracketLogic.js';
import { Matchup } from './Matchup.jsx';
import { ChampionCard } from './ChampionCard.jsx';

// The whole bracket. Wide screens: symmetric (R1 → QF → SF → Title ← SF ← QF ← R1).
// Phones: one round per swipe.
//
// winners decides who advances on screen — a player's picks, or the real results in the
// Commissioner panel. statusFor(gameKey) optionally marks right/wrong picks.
export function BracketView({ seeds, winners, onPick, statusFor, locked }) {
  const wide = useMediaQuery('(min-width: 960px)');
  const bySeed = Object.fromEntries(seeds.map(t => [t.seed, t]));
  const teamById = Object.fromEntries(seeds.map(t => [t.id, t]));
  const shared = { bySeed, teamById, winners, statusFor, onPick, locked };
  const champion = winners[CHAMPIONSHIP_KEY] ? teamById[winners[CHAMPIONSHIP_KEY]] : null;

  const column = (round, side, key) => (
    <div className={`bk-col bk-${round}`} key={key}>
      <div className="bk-col-head">{ROUNDS.find(r => r.id === round).label}</div>
      <div className="bk-col-body">
        {GAMES.filter(g => g.round === round && (!side || g.side === side)).map(g => <Matchup key={g.key} gameKey={g.key} {...shared} />)}
        {round === 'nc' && <ChampionCard team={champion} />}
      </div>
    </div>
  );

  if (wide) {
    return (
      <div className="bk-grid wide">
        {column('r1', 'L', 'r1L')}
        {column('qf', 'L', 'qfL')}
        {column('sf', 'L', 'sfL')}
        {column('nc', null, 'nc')}
        {column('sf', 'R', 'sfR')}
        {column('qf', 'R', 'qfR')}
        {column('r1', 'R', 'r1R')}
      </div>
    );
  }
  return <div className="bk-grid narrow">{ROUNDS.map(r => column(r.id, null, r.id))}</div>;
}
