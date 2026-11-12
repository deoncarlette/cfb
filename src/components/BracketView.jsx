import { useEffect, useState } from 'react';
import { GAMES, ROUNDS, GAME_BY_KEY, CHAMPIONSHIP_KEY, participants, slotPlaceholder } from '../bracket.js';
import { textForBackground } from '../espn.js';

// Symmetric bracket on wide screens (R1 → QF → SF → Title ← SF ← QF ← R1), and a swipeable
// round-by-round column layout on phones. Both render the same Matchup cards.

function useIsWide(minWidth = 960) {
  const query = `(min-width: ${minWidth}px)`;
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return wide;
}

const roundLabel = id => ROUNDS.find(r => r.id === id).label;

function TeamRow({ team, placeholder, seed, selected, status, disabled, onClick }) {
  if (!team) {
    return <div className="bk-team empty"><span className="bk-seed">{seed ?? ''}</span><span className="bk-name">{placeholder}</span></div>;
  }
  const style = selected ? { background: team.color, borderColor: team.color, color: textForBackground(team.color) } : undefined;
  const mark = selected && status === 'correct' ? '✓' : selected && (status === 'wrong' || status === 'dead') ? '✕' : null;
  return (
    <button
      type="button"
      className={'bk-team' + (selected ? ' sel' : '') + (selected && status ? ` ${status}` : '')}
      style={style}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="bk-seed">{team.seed}</span>
      <span className="team-logo-swatch" style={{ '--swatch-color': team.color }}>
        {team.logo && <img src={team.logo} alt="" />}
      </span>
      <span className="bk-name">{team.name}</span>
      {mark ? <span className="bk-mark">{mark}</span> : team.record && <span className="bk-record">{team.record}</span>}
    </button>
  );
}

function Matchup({ gameKey, bySeed, teamById, winners, statusFor, onPick, locked }) {
  const g = GAME_BY_KEY[gameKey];
  const [topId, bottomId] = participants(gameKey, bySeed, winners);
  const pick = winners[gameKey];
  const status = statusFor ? statusFor(gameKey) : null;
  const slots = [[g.top, topId], [g.bottom, bottomId]];
  const canPick = !locked && onPick && topId && bottomId;
  return (
    <div className={'bk-match' + (gameKey === CHAMPIONSHIP_KEY ? ' title' : '')}>
      {slots.map(([slot, id], i) => (
        <TeamRow
          key={i}
          team={id ? teamById[id] : null}
          placeholder={slotPlaceholder(slot)}
          seed={slot.seed}
          selected={!!pick && pick === id}
          status={status}
          disabled={!canPick}
          onClick={() => onPick(gameKey, id)}
        />
      ))}
    </div>
  );
}

function Champion({ team }) {
  return (
    <div className="bk-champ">
      <span className="bk-champ-label">Champion</span>
      {team ? (
        <span className="bk-champ-team">
          <span className="team-logo-swatch big" style={{ '--swatch-color': team.color }}>
            {team.logo && <img src={team.logo} alt="" />}
          </span>
          {team.name}
        </span>
      ) : <span className="muted small">Pick a title winner</span>}
    </div>
  );
}

// winners: the map that decides who advances on screen — a player's picks, or the real
// results in the Commissioner panel. statusFor(gameKey) optionally marks right/wrong picks.
export function BracketView({ seeds, winners, onPick, statusFor, locked }) {
  const wide = useIsWide();
  const bySeed = Object.fromEntries(seeds.map(t => [t.seed, t]));
  const teamById = Object.fromEntries(seeds.map(t => [t.id, t]));
  const shared = { bySeed, teamById, winners, statusFor, onPick, locked };
  const champion = winners[CHAMPIONSHIP_KEY] ? teamById[winners[CHAMPIONSHIP_KEY]] : null;

  const keysFor = (round, side) => GAMES.filter(g => g.round === round && (!side || g.side === side)).map(g => g.key);

  const column = (round, side, key) => (
    <div className={`bk-col bk-${round}`} key={key}>
      <div className="bk-col-head">{roundLabel(round)}</div>
      <div className="bk-col-body">
        {keysFor(round, side).map(k => <Matchup key={k} gameKey={k} {...shared} />)}
        {round === 'nc' && <Champion team={champion} />}
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

  return (
    <div className="bk-grid narrow">
      {ROUNDS.map(r => column(r.id, null, r.id))}
    </div>
  );
}
