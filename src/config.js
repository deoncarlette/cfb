// Season-wide settings. Bump SEASON each year.
export const SEASON = 2026;

// After this week, the CFP committee's rankings replace the AP-style rank shown on game
// cards (see services/espn/games.js → applyRankOverlay).
export const CFP_SWITCH_WEEK = 10;

// The pool's week numbers run one behind ESPN's this season (pool Week 11 = ESPN Week 12,
// the Nov 14 games). The app uses POOL weeks everywhere — dropdowns, saved picks, the sample
// files — and converts only when it asks ESPN for games. Set to 0 if they ever line up.
export const ESPN_WEEK_OFFSET = 1;
export const toEspnWeek = poolWeek => poolWeek + ESPN_WEEK_OFFSET;
export const fromEspnWeek = espnWeek => Math.max(0, espnWeek - ESPN_WEEK_OFFSET);
