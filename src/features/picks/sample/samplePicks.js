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
// Before then: the same games with no picks on them (ready to fill in), and no one's picks
// can be viewed.
const HIDE_UNTIL = {
  11: '2026-11-14T21:00:00-06:00' // Week 11: Saturday, Nov 14, 9 PM Central
};

let fileCache = null;
async function loadFile() {
  if (!fileCache) fileCache = import('./all-picks-2026.json').then(m => m.default);
  return fileCache;
}

// Who actually won (a replayed game keeps its real winner while it plays back), or null.
const realWinnerOf = g => g.realWinner ?? (g.completed ? g.competitors.find(c => c.winner)?.id ?? null : null);

// One ballot → { user_name, picks: { espnGameId: { winner, confidence } }, isMock } using the
// file-game → ESPN-game map. Simulated picks are fitted to the player's recorded score once
// every game's real winner is known — see fitToScore.
function ballotEntry(ballot, espnByFileId) {
  const picks = {}; const simulated = new Set();
  ballot.picks.forEach(p => {
    const game = espnByFileId.get(p.gameId);
    const winner = game && game.competitors.find(c => teamMatches(p.pick, c));
    if (!winner) return;
    picks[game.id] = { winner: winner.id, confidence: p.confidence };
    if (p.isMock) simulated.add(game.id);
  });
  if (simulated.size && ballot.weeklyScore != null) fitToScore(picks, simulated, Number(ballot.weeklyScore), espnByFileId);
  return { user_name: ballot.playerName, picks, isMock: !!ballot.isMockBallot };
}

// Simulated picks were seeded for looks, not to add up. Once every game on the ballot has a
// real winner, flip the fewest simulated picks (same points, other team) so the ballot scores
// exactly the player's recorded weekly score. Real picks never change. If no combination of
// simulated picks can reach the score, the ballot is left as it was.
function fitToScore(picks, simulated, target, espnByFileId) {
  const games = new Map([...espnByFileId.values()].map(g => [g.id, g]));
  const winners = new Map();
  for (const id of Object.keys(picks)) {
    const w = games.get(id) && realWinnerOf(games.get(id));
    if (!w) return; // some game isn't decided yet: nothing to fit to
    winners.set(id, w);
  }
  let fixed = 0; const items = [];
  for (const [id, p] of Object.entries(picks)) {
    const right = p.winner === winners.get(id);
    if (!simulated.has(id)) { if (right) fixed += Number(p.confidence) || 0; }
    else items.push({ id, conf: Number(p.confidence) || 0, right });
  }
  const need = target - fixed;
  const max = items.reduce((t, i) => t + i.conf, 0);
  if (need < 0 || need > max) return;
  // best[s] = fewest flips for the simulated picks so far to score s; choice tracks the path.
  let best = new Array(max + 1).fill(Infinity); best[0] = 0;
  const steps = [];
  for (const it of items) {
    const next = new Array(max + 1).fill(Infinity); const took = new Array(max + 1).fill(false);
    for (let s = 0; s <= max; s++) {
      if (best[s] === Infinity) continue;
      const wrong = best[s] + (it.right ? 1 : 0);                 // make it a miss
      if (wrong < next[s]) { next[s] = wrong; took[s] = false; }
      const right = best[s] + (it.right ? 0 : 1);                  // make it a hit
      if (s + it.conf <= max && right < next[s + it.conf]) { next[s + it.conf] = right; took[s + it.conf] = true; }
    }
    steps.push(took); best = next;
  }
  if (best[need] === Infinity) return;
  for (let k = items.length - 1, s = need; k >= 0; k--) {
    const it = items[k]; const hit = steps[k][s];
    if (hit !== it.right) {
      const other = games.get(it.id).competitors.find(c => c.id !== picks[it.id].winner);
      picks[it.id] = { ...picks[it.id], winner: other.id };
    }
    if (hit) s -= it.conf;
  }
}

// For a week in the file:
// { playerName, gameIds, picks, matched, total, missing: [matchup],
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
    return { ...base, playerName: null, picks: {}, ballots: new Map(), hidden: true };
  }
  const ballots = new Map(fileWeek.ballots.filter(b => b.entered && b.picks.length)
    .map(b => [b.playerName.trim().toLowerCase(), ballotEntry(b, espnByFileId)]));
  const mine = ballots.get(DEFAULT_PLAYER.toLowerCase());
  // playerName null when Deandra didn't play that week (Week 0): blank cards, others viewable.
  return { ...base, playerName: mine ? DEFAULT_PLAYER : null, picks: mine ? mine.picks : {}, isMock: mine?.isMock, ballots, hidden: false };
}

// The first week the file covers (Week 1). Earlier weeks have no games in the app.
export async function firstSampleWeek() {
  const file = await loadFile();
  return Math.min(...file.weeks.map(w => w.week));
}
