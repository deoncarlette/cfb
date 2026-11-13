// Team classification helpers: Power 4 membership and ranking rules.

// Best-effort Power 4 membership for sorting/categorizing games — ESPN's scoreboard
// endpoint doesn't return conference names directly, so this is a maintained list rather
// than live data. Matched against ESPN's team "location" name (the unabbreviated school
// name, e.g. "Washington State" not "Washington St"). Realignment happens — double check
// this periodically.
export const SEC_TEAMS = new Set([
  "Alabama","Arkansas","Auburn","Florida","Georgia","Kentucky","LSU","Mississippi State",
  "Missouri","Ole Miss","South Carolina","Tennessee","Texas A&M","Vanderbilt","Oklahoma","Texas"
]);
export const BIG_TEN_TEAMS = new Set([
  "Illinois","Indiana","Iowa","Maryland","Michigan","Michigan State","Minnesota","Nebraska",
  "Northwestern","Ohio State","Penn State","Purdue","Rutgers","Wisconsin","UCLA","USC","Oregon","Washington"
]);
export const BIG_12_TEAMS = new Set([
  "Baylor","BYU","Cincinnati","Houston","Iowa State","Kansas","Kansas State","Oklahoma State",
  "TCU","Texas Tech","UCF","West Virginia","Arizona","Arizona State","Colorado","Utah"
]);
export const ACC_TEAMS = new Set([
  "Boston College","California","Clemson","Duke","Florida State","Georgia Tech","Louisville",
  "Miami","NC State","North Carolina","Pittsburgh","SMU","Stanford","Syracuse","Virginia",
  "Virginia Tech","Wake Forest"
]);
export const P4_TEAMS = new Set([...SEC_TEAMS, ...BIG_TEN_TEAMS, ...BIG_12_TEAMS, ...ACC_TEAMS]);

export function isP4(name) { return P4_TEAMS.has((name || '').trim()); }

// The pool always includes Howard's game, whoever they play.
export const ALWAYS_INCLUDE = new Set(['Howard']);

// ESPN uses 99 as the "unranked" placeholder in curatedRank — it isn't a real vote count.
// Treat anything under that as a real, sortable rank even outside the AP top 25, but only
// ever DISPLAY the number when it's an actual top-25 rank.
export function hasRealRank(c) { return !!c.rank && c.rank < 99; }
export function displayRank(c) { return c && c.rank && c.rank <= 25 ? c.rank : null; }
export function bestRealRank(game) {
  const ranks = game.competitors.filter(hasRealRank).map(c => c.rank);
  return ranks.length ? Math.min(...ranks) : 999;
}

// 'top25' | 'power4' | 'meac' | 'other' — drives the Commissioner sections and the default slate.
export function gameCategory(game) {
  if (game.competitors.some(hasRealRank)) return 'top25';
  if (game.competitors.some(c => isP4(c.name))) return 'power4';
  if (game.competitors.some(c => conferenceOf(c) === 'MEAC')) return 'meac';
  return 'other';
}

// Default slate before the commissioner picks games: any Top 25 team, Howard, or an SEC or
// Big Ten team. (The Commish tab still shows every game to choose from.)
export function isDefaultSlateGame(game) {
  return game.competitors.some(c =>
    displayRank(c) || ALWAYS_INCLUDE.has(c.name) || SEC_TEAMS.has(c.name) || BIG_TEN_TEAMS.has(c.name));
}

// ---- Conferences (for the Commish tab's subgroups) ----

// Power 4 come from the lists above. Everyone else comes from ESPN's conferenceId on the team.
// Ids from ESPN's conference index (espn.com/college-football/conferences, checked Nov 2026).
// Unknown ids fall into "Other".
const FBS_BY_ESPN_ID = {
  '151': 'American', '17': 'Mountain West', '37': 'Sun Belt', '15': 'MAC',
  '12': 'Conference USA', '9': 'Pac-12', '18': 'FBS Independents'
};
const FCS_BY_ESPN_ID = {
  '175': 'ASUN-WAC', '176': 'ASUN', '20': 'Big Sky', '40': 'Big South', '48': 'CAA',
  '32': 'FCS Independents', '43': 'Great West', '22': 'Ivy', '24': 'MEAC', '21': 'Missouri Valley',
  '25': 'Northeast', '26': 'Ohio Valley', '179': 'OVC', '27': 'Patriot', '28': 'Pioneer',
  '29': 'Southern', '30': 'Southland', '31': 'SWAC', '177': 'UAC'
};
export const P4_ORDER = ['SEC', 'Big Ten', 'Big 12', 'ACC'];
// "All Other Games" subgroups: FBS conferences first, then FCS A–Z, then anything unrecognized.
export const OTHER_ORDER = [
  'American', 'Mountain West', 'Sun Belt', 'MAC', 'Conference USA', 'Pac-12', 'FBS Independents',
  ...Object.values(FCS_BY_ESPN_ID).sort((a, b) => a.localeCompare(b)), 'Other'
];

export function conferenceOf(team) {
  if (SEC_TEAMS.has(team.name)) return 'SEC';
  if (BIG_TEN_TEAMS.has(team.name)) return 'Big Ten';
  if (BIG_12_TEAMS.has(team.name)) return 'Big 12';
  if (ACC_TEAMS.has(team.name)) return 'ACC';
  return FBS_BY_ESPN_ID[team.conferenceId] || FCS_BY_ESPN_ID[team.conferenceId] || null;
}

// Which conference a game is filed under: the home team's (a Power 4 team's, in the Power 4
// section), else the away team's, else "Other".
export function gameConference(game, p4Only = false) {
  const [away, home] = game.competitors;
  const pick = t => { const c = conferenceOf(t); return c && (!p4Only || P4_ORDER.includes(c)) ? c : null; };
  return pick(home) || pick(away) || 'Other';
}
