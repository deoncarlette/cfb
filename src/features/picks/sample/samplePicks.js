// Sample data: every player's 2026 picks (all-picks-2026.json — reconstructed; some picks are
// simulated and marked isMock). For any week in the file:
//   - that week's slate is exactly the file's games (matched to ESPN's games by team name)
//   - DEFAULT_PLAYER's picks show on the cards until someone saves their own
//   - everyone's picks can be viewed with the "View picks for" selector once the week locks
// To update: replace all-picks-2026.json with a corrected file in the same format.

export const DEFAULT_PLAYER = 'Deandra';

// Names people type → names ESPN uses.
const ALIASES = {
  'unc': ['north carolina'],
  'pitt': ['pittsburgh'],
  'nc central': ['north carolina central'],
  'louisiana monroe': ['ul monroe', 'louisiana-monroe'],
  'penn': ['pennsylvania'],
  'uconn': ['connecticut'],
  'ole miss': ['mississippi'],
  'sam houston': ['sam houston state'],
  'the citadel': ['citadel'],
  'southern miss': ['southern mississippi']
};

const norm = s => (s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9()]+/g, ' ').trim();

function teamMatches(name, competitor) {
  const want = [name, ...(ALIASES[name.toLowerCase()] || [])].map(norm);
  const have = [competitor.name, ...(competitor.altNames || [])].map(norm);
  return want.some(w => have.includes(w));
}

// "Team vs Team" → the ESPN game with both teams, or null.
function findGame(matchup, games) {
  const [a, b] = matchup.split(/\s+vs\.?\s+/i);
  if (!a || !b) return null;
  return games.find(g => [a, b].every(n => g.competitors.some(c => teamMatches(n, c)))) || null;
}

// Weeks whose picks stay hidden until a set time (so a shared demo doesn't give them away).
// Before then: the same games, but the cards show random winners in a random order, and no
// one's picks can be viewed.
const HIDE_UNTIL = {
  11: '2026-11-14T21:00:00-06:00' // Week 11: Saturday, Nov 14, 9 PM Central
};

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Same games, random winners, random confidence order.
function randomPicks(gameIds, games) {
  const byId = new Map(games.map(g => [g.id, g]));
  const confidences = shuffled(gameIds.map((_, i) => i + 1));
  const picks = {};
  gameIds.forEach((id, i) => {
    const teams = byId.get(id).competitors;
    picks[id] = { winner: teams[Math.random() < 0.5 ? 0 : 1].id, confidence: confidences[i] };
  });
  return picks;
}

let fileCache = null;
async function loadFile() {
  if (!fileCache) fileCache = import('./all-picks-2026.json').then(m => m.default);
  return fileCache;
}

// One ballot → { user_name, picks: { espnGameId: { winner, confidence } }, isMock } using the
// file-game → ESPN-game map.
function ballotEntry(ballot, espnByFileId) {
  const picks = {};
  ballot.picks.forEach(p => {
    const game = espnByFileId.get(p.gameId);
    const winner = game && game.competitors.find(c => teamMatches(p.pick, c));
    if (winner) picks[game.id] = { winner: winner.id, confidence: p.confidence };
  });
  return { user_name: ballot.playerName, picks, isMock: !!ballot.isMockBallot };
}

// For a week in the file:
// { playerName, gameIds, picks, randomized, matched, total, missing: [matchup],
//   ballots: Map(lowercase name → entry), hidden }
// null if the week isn't in the file or fewer than half its games were found on ESPN.
export async function samplePicksForWeek(week, games) {
  const file = await loadFile();
  const fileWeek = file.weeks.find(fw => fw.week === week); // the file's own week number, exactly
  if (!fileWeek) return null;

  const espnByFileId = new Map(); const missing = [];
  fileWeek.games.forEach(g => {
    const espn = findGame(g.matchup, games);
    espn ? espnByFileId.set(g.gameId, espn) : missing.push(g.matchup);
  });
  if (espnByFileId.size < fileWeek.games.length / 2) return null;
  if (missing.length) console.warn(`Week ${week}: couldn't find these games on ESPN:`, missing);
  const gameIds = [...espnByFileId.values()].map(g => g.id);
  const base = { gameIds, matched: gameIds.length, total: fileWeek.games.length, missing };

  if (HIDE_UNTIL[week] && Date.now() < new Date(HIDE_UNTIL[week]).getTime()) {
    return { ...base, playerName: null, picks: randomPicks(gameIds, games), randomized: true, ballots: new Map(), hidden: true };
  }
  const ballots = new Map(fileWeek.ballots.filter(b => b.entered && b.picks.length)
    .map(b => [b.playerName.trim().toLowerCase(), ballotEntry(b, espnByFileId)]));
  const mine = ballots.get(DEFAULT_PLAYER.toLowerCase());
  // playerName null when Deandra didn't play that week (Week 0): blank cards, others viewable.
  return { ...base, playerName: mine ? DEFAULT_PLAYER : null, picks: mine ? mine.picks : {}, isMock: mine?.isMock, randomized: false, ballots, hidden: false };
}

// The first week the file covers (Week 1). Earlier weeks have no games in the app.
export async function firstSampleWeek() {
  const file = await loadFile();
  return Math.min(...file.weeks.map(w => w.week));
}
