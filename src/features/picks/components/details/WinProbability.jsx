import { teamFill } from '@/shared/utils/colors.js';

// Split bar: each team's chance to win, in its color.
export function WinProbability({ prob, away, home }) {
  return (
    <section className="gd-section">
      <h4>{prob.live ? 'Win probability (live)' : 'ESPN matchup predictor'}</h4>
      <div className="wp-labels"><strong>{prob.away}%</strong><strong>{prob.home}%</strong></div>
      <div className="wp-bar">
        <span style={{ width: `${prob.away}%`, background: teamFill(away) }} />
        <span style={{ width: `${prob.home}%`, background: teamFill(home) }} />
      </div>
    </section>
  );
}
