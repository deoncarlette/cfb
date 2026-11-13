import { useState } from 'react';
import { useGameSummary } from '../../hooks/useGameSummary.js';
import { rewindSummary } from '@/services/espn/replay.js';
import { WinProbability } from './WinProbability.jsx';
import { CompareRows } from './CompareRows.jsx';
import { LineScore } from './LineScore.jsx';
import { Leaders } from './Leaders.jsx';
import { LastFive } from './LastFive.jsx';
import { ScoringPlays } from './ScoringPlays.jsx';
import { PoolPicks } from './PoolPicks.jsx';

const ml = v => (v == null ? null : v > 0 ? `+${v}` : String(v));

// The panel that opens under a game card. Kept short up top; "More" opens the rest.
// Before kickoff: predictor, pool picks (once locked), matchup rows | More: season leaders, notes.
// Live / final: line score, win probability, pool picks | More: team stats, leaders, scoring
// plays, notes. (The TV network is on the card itself; the stadium is in the notes.)
// pool: everyone's picks on this game (only passed once it locks) → Pool picks section.
export function GameDetails({ game, pool }) {
  const [more, setMore] = useState(false);
  const started = game.completed || game.state === 'in';
  // Test replay: the real box score rewound to the replayed game clock (the card's refresh
  // moves game.replay.f forward, so this follows along without its own polling).
  const { summary: raw, error } = useGameSummary(game.id, game.state === 'in' && !game.replay);
  const s = game.replay && raw ? rewindSummary(raw, game.replay.f) : raw;
  // Full names up top (the pill uses short names on phones) — straight from the card, so they
  // show while the details load.
  const [cardAway, cardHome] = game.competitors;
  const header = <div className="gd-teams"><span>{cardAway.name}</span><span>{cardHome.name}</span></div>;
  const poolSection = pool?.length ? <PoolPicks game={game} pool={pool} /> : null;
  if (error) return <div className="game-details">{header}{poolSection}<p className="muted small center">{error}</p></div>;
  if (!s) return <div className="game-details">{header}{poolSection}<p className="muted small center">Loading…</p></div>;

  // Colors come from the card's teams (ESPN's summary uses the same ids).
  const away = { ...s.away, color: cardAway.color, altColor: cardAway.altColor };
  const home = { ...s.home, color: cardHome.color, altColor: cardHome.altColor };

  const pregameRows = [
    { label: 'Record', away: s.away.record, home: s.home.record },
    { label: 'Away / Home', away: s.away.venueRecord, home: s.home.venueRecord },
    s.ats && { label: 'Against spread', away: s.ats.away, home: s.ats.home },
    s.odds && (s.odds.moneyline.away != null || s.odds.moneyline.home != null) && { label: 'Moneyline', away: ml(s.odds.moneyline.away), home: ml(s.odds.moneyline.home) },
    s.lastFive && { label: 'Last 5', away: <LastFive games={s.lastFive.away} />, home: <LastFive games={s.lastFive.home} /> }
  ].filter(r => r && (r.away != null || r.home != null));

  const facts = [
    !started && s.odds?.details && `${s.odds.details}${s.odds.overUnder != null ? `, O/U ${s.odds.overUnder}` : ''}${s.odds.provider ? ` (${s.odds.provider})` : ''}`,
    !game.broadcast && s.broadcast && `TV: ${s.broadcast}`,
    (game.title || game.broadcast) && game.venue && game.venue,
    s.weather && `Weather: ${s.weather}`,
    started && s.attendance && `Attendance: ${Number(s.attendance).toLocaleString()}`
  ].filter(Boolean);

  return (
    <div className="game-details">
      {header}
      {started && <LineScore away={s.away} home={s.home} />}
      {s.winProb && (!started || s.winProb.live) && <WinProbability prob={s.winProb} away={away} home={home} />}
      {poolSection}
      {!started && <CompareRows title="Matchup" rows={pregameRows} />}
      <button type="button" className="gd-more" aria-expanded={more} onClick={() => setMore(m => !m)}>
        {more ? 'Less' : started ? 'More stats' : 'More'} <span className="chev" aria-hidden="true">▾</span>
      </button>
      {more && (
        <>
          {s.replay?.estimatedStats && game.state === 'in' && (
            <p className="gd-note">Test replay: score, quarters and scoring plays are exact to the game clock. Team stats and leaders are the final totals scaled to the share of the game played.</p>
          )}
          {started && <CompareRows title="Team stats" rows={s.stats} />}
          <Leaders leaders={s.leaders} started={started} />
          {started && <ScoringPlays plays={s.scoring} away={s.away} home={s.home} />}
          {facts.length > 0 && <p className="gd-facts">{facts.map(f => <span key={f}>{f}</span>)}</p>}
        </>
      )}
    </div>
  );
}
