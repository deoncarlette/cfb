import { SEASON } from '@/config.js';
import { ROUND_POINTS, MAX_POINTS } from '../bracketLogic.js';

export function BracketIntro() {
  return (
    <>
      <p className="section-label">College Football Playoff {SEASON}–{String(SEASON + 1).slice(2)}</p>
      <h2>Fill out your bracket</h2>
      <p className="muted small">
        Points double each round: {ROUND_POINTS.r1} / {ROUND_POINTS.qf} / {ROUND_POINTS.sf} / {ROUND_POINTS.nc}. Perfect bracket = {MAX_POINTS}.
        {' '}Tiebreaker is the title game's combined score.
      </p>
    </>
  );
}
