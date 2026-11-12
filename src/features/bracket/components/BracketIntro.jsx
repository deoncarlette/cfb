import { SEASON } from '@/config.js';
import { ROUND_POINTS, MAX_POINTS } from '../bracketLogic.js';

export function BracketIntro() {
  return (
    <>
      <h2>{SEASON}–{String(SEASON + 1).slice(2)} College Football Playoff</h2>
      <p className="muted small">
        Points double each round: {ROUND_POINTS.r1} / {ROUND_POINTS.qf} / {ROUND_POINTS.sf} / {ROUND_POINTS.nc}. Perfect bracket = {MAX_POINTS}.
        {' '}Tiebreaker is the title game's combined score.
      </p>
    </>
  );
}
