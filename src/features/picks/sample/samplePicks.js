// Deandra's real 2026 picks (deandra-2026.json) are the app's sample data: for any week in the
// file, that week's slate is exactly those games and the picks show by default (until someone
// saves their own). Picks are written "Team vs Team", so each one is matched to ESPN's game.

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

// One "Team vs Team" pick → { game, winnerId } or null.
function findGame(pick, games) {
  const [a, b] = pick.matchup.split(/\s+vs\.?\s+/i);
  if (!a || !b) return null;
  const game = games.find(g => [a, b].every(n => g.competitors.some(c => teamMatches(n, c))));
  if (!game) return null;
  const winner = game.competitors.find(c => teamMatches(pick.pick, c));
  return winner ? { game, winnerId: winner.id } : null;
}

let fileCache = null;
async function loadFile() {
  if (!fileCache) fileCache = import('./deandra-2026.json').then(m => m.default);
  return fileCache;
}

// For a week in the file: { playerName, gameIds, picks: { gameId: { winner, confidence } },
// matched, total, missing: [matchup] }. null if the week isn't in the file or too few of its
// games were found on ESPN (then the normal default slate is used).
export async function samplePicksForWeek(week, games) {
  const file = await loadFile();
  const fileWeek = file.weeks.find(w => w.week === week);
  if (!fileWeek) return null;
  const picks = {}; const gameIds = []; const missing = [];
  fileWeek.picks.forEach(p => {
    const m = findGame(p, games);
    if (!m) { missing.push(p.matchup); return; }
    picks[m.game.id] = { winner: m.winnerId, confidence: p.confidence };
    gameIds.push(m.game.id);
  });
  if (gameIds.length < fileWeek.picks.length / 2) return null;
  if (missing.length) console.warn(`Week ${week}: couldn't find these games on ESPN:`, missing);
  return { playerName: file.participant, gameIds, picks, matched: gameIds.length, total: fileWeek.picks.length, missing };
}
