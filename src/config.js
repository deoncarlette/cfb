// Season-wide settings. Bump SEASON each year.
export const SEASON = 2026;

// The first week with a CFP committee poll. From this week on, every ranking comes from the
// latest CFP poll (this week's, or the previous one until it's out) — never AP. See
// services/espn/rankings.js → cfpPollAtOrBefore and games.js → applyRankOverlay.
export const CFP_SWITCH_WEEK = 10;


// TESTING: replay this week's (already finished) games on today's clock. Each game "kicks off"
// today at its real time of day and plays out over ~3½ hours, scores filling in toward the
// real final — so live games, auto-refresh and locking can be tested any day.
// Set with VITE_REPLAY_WEEK to replay a finished week as if live (the /cfb/cfp preview used 10
// while Week 10 was the test week; off since Week 11 went live). Unset = off, for the real app.
export const REPLAY_WEEK = Number(import.meta.env.VITE_REPLAY_WEEK) || null;
