// Season-wide settings. Bump SEASON each year.
export const SEASON = 2026;

// After this week, the CFP committee's rankings replace the AP-style rank shown on game
// cards (see services/espn/games.js → applyRankOverlay).
export const CFP_SWITCH_WEEK = 10;


// TESTING: replay this week's (already finished) games on today's clock. Each game "kicks off"
// today at its real time of day and plays out over ~3½ hours, scores filling in toward the
// real final — so live games, auto-refresh and locking can be tested any day.
// Set with VITE_REPLAY_WEEK (the /cfb/cfp preview uses 10). Unset = off, for the real app.
export const REPLAY_WEEK = Number(import.meta.env.VITE_REPLAY_WEEK) || null;
