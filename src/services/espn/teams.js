// Team classification helpers: Power 4 membership and ranking rules.

// Best-effort Power 4 membership for sorting/categorizing games — ESPN's scoreboard
// endpoint doesn't return conference names directly, so this is a maintained list rather
// than live data. Matched against ESPN's team "location" name (the unabbreviated school
// name, e.g. "Washington State" not "Washington St"). Realignment happens — double check
// this periodically.
export const P4_TEAMS = new Set([
  // SEC
  "Alabama","Arkansas","Auburn","Florida","Georgia","Kentucky","LSU","Mississippi State",
  "Missouri","Ole Miss","South Carolina","Tennessee","Texas A&M","Vanderbilt","Oklahoma","Texas",
  // Big Ten
  "Illinois","Indiana","Iowa","Maryland","Michigan","Michigan State","Minnesota","Nebraska",
  "Northwestern","Ohio State","Penn State","Purdue","Rutgers","Wisconsin","UCLA","USC","Oregon","Washington",
  // Big 12
  "Baylor","BYU","Cincinnati","Houston","Iowa State","Kansas","Kansas State","Oklahoma State",
  "TCU","Texas Tech","UCF","West Virginia","Arizona","Arizona State","Colorado","Utah",
  // ACC
  "Boston College","California","Clemson","Duke","Florida State","Georgia Tech","Louisville",
  "Miami","NC State","North Carolina","Pittsburgh","SMU","Stanford","Syracuse","Virginia",
  "Virginia Tech","Wake Forest"
]);

export function isP4(name) { return P4_TEAMS.has((name || '').trim()); }

// ESPN uses 99 as the "unranked" placeholder in curatedRank — it isn't a real vote count.
// Treat anything under that as a real, sortable rank even outside the AP top 25, but only
// ever DISPLAY the number when it's an actual top-25 rank.
export function hasRealRank(c) { return !!c.rank && c.rank < 99; }
export function displayRank(c) { return c && c.rank && c.rank <= 25 ? c.rank : null; }
export function bestRealRank(game) {
  const ranks = game.competitors.filter(hasRealRank).map(c => c.rank);
  return ranks.length ? Math.min(...ranks) : 999;
}

// 'top25' | 'power4' | 'other' — drives the Commissioner sections and the default slate.
export function gameCategory(game) {
  if (game.competitors.some(hasRealRank)) return 'top25';
  if (game.competitors.some(c => isP4(c.name))) return 'power4';
  return 'other';
}
