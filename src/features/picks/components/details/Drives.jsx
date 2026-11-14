// Every drive in order: quarter and clock it started, which team, how it ended, its summary
// ("8 plays, 75 yards, 3:21") and the score after it. Scores and turnovers are tagged so they
// stand out. Falls back to the scoring plays when ESPN has no drive data for a game.
import { ScoringPlays } from './ScoringPlays.jsx';

const TURNOVER = /interception|fumble|downs|\bint\b|\bfum\b/i;
const kind = d => (d.current && !d.result ? 'current' : d.isScore || /touchdown|field goal|safety/i.test(d.result) && !/missed|blocked/i.test(d.result) ? 'score' : TURNOVER.test(d.result) ? 'turnover' : '');

export function Drives({ drives, scoring, away, home }) {
  if (!drives?.length) return <ScoringPlays plays={scoring || []} away={away} home={home} />;
  const abbr = id => (id === away.id ? away.abbr : id === home.id ? home.abbr : '');
  return (
    <section className="gd-section">
      <h4>Drives</h4>
      <ol className="scoring drives">
        {drives.map((d, i) => {
          const k = kind(d);
          return (
            <li key={i} className={k}>
              <span className="sp-when">Q{d.period} {d.clock}</span>
              <span className="sp-team">{abbr(d.teamId)}</span>
              <span className="sp-text">
                <span className={'drive-result ' + k}>{k === 'current' ? 'In progress' : d.result || '—'}</span>
                {d.description && <span className="drive-desc">{d.description}</span>}
              </span>
              <span className="sp-score">{k === 'score' && d.score ? `${d.score.away}–${d.score.home}` : ''}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
