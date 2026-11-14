// Every drive in order: quarter and clock it started, which team, how it ended, its summary
// ("8 plays, 75 yards, 3:21") and the score after it. Scores and turnovers are tagged so they
// stand out. Falls back to the scoring plays when ESPN has no drive data for a game.
import { useState } from 'react';
import { ScoringPlays } from './ScoringPlays.jsx';

const TURNOVER = /interception|fumble|downs|\bint\b|\bfum\b/i;
const kind = d => (d.current && !d.result ? 'current' : d.isScore || /touchdown|field goal|safety/i.test(d.result) && !/missed|blocked/i.test(d.result) ? 'score' : TURNOVER.test(d.result) ? 'turnover' : '');

const qName = p => (p <= 4 ? ['1st', '2nd', '3rd', '4th'][p - 1] + ' Quarter' : p === 5 ? 'Overtime' : `${p - 4}OT`);

// Grouped by quarter under collapsible dividers; during a live game only the current quarter
// starts open (finished games start with every quarter closed). Each divider sums up the
// quarter: drives, scores and turnovers.
export function Drives({ drives, scoring, away, home, live }) {
  if (!drives?.length) return <ScoringPlays plays={scoring || []} away={away} home={home} />;
  const abbr = id => (id === away.id ? away.abbr : id === home.id ? home.abbr : '');
  const periods = [...new Set(drives.map(d => d.period))].sort((a, b) => a - b);
  const current = live ? periods[periods.length - 1] : null;
  return (
    <section className="gd-section">
      <h4>Drives</h4>
      {periods.map(p => <Quarter key={p} period={p} drives={drives.filter(d => d.period === p)} abbr={abbr} startOpen={p === current} />)}
    </section>
  );
}

function Quarter({ period, drives, abbr, startOpen }) {
  const [open, setOpen] = useState(startOpen);
  const kinds = drives.map(kind);
  const scores = kinds.filter(k => k === 'score').length, tos = kinds.filter(k => k === 'turnover').length;
  const summary = [`${drives.length} ${drives.length === 1 ? 'drive' : 'drives'}`, scores && `${scores} ${scores === 1 ? 'score' : 'scores'}`, tos && `${tos} ${tos === 1 ? 'turnover' : 'turnovers'}`].filter(Boolean).join(' · ');
  return (
    <div className={'drive-q' + (open ? ' open' : '')}>
      <button type="button" className="drive-q-head" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span>{qName(period)}</span>
        <span className="drive-q-sum">{summary}<span className="chev" aria-hidden="true">▾</span></span>
      </button>
      {open && (
        <ol className="scoring drives">
          {drives.map((d, i) => {
            const k = kind(d);
            return (
              <li key={i} className={k}>
                <span className="sp-when">{d.clock}</span>
                <span className="sp-team">{abbr(d.teamId)}</span>
                <span className="sp-text">
                  <span className={'drive-result ' + k}>{k === 'current' ? 'In progress' : d.result || '—'}</span>
                  {d.description && <span className="drive-desc">{d.description}</span>}
                </span>
                {/* Score after scoring drives, and turnovers returned for a score (pick-six, scoop-and-score). */}
                <span className="sp-score">{(k === 'score' || k === 'turnover') && d.score ? `${d.score.away}–${d.score.home}` : ''}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
