import { fetchEspnGames } from '@/services/espn/index.js';
import { getWeekConfig, saveWeekConfig, submitPicks } from '@/services/data/index.js';

// Loads a season of picks written as "Team vs Team" (like deandra-2026.json) into the app:
// finds each game on ESPN, saves the picks under the player's name, and — if the commissioner
// hasn't set that week's slate — sets the slate to exactly those games.

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

// One pick → { game, winnerId } or null.
function findGame(pick, games) {
  const [a, b] = pick.matchup.split(/\s+vs\.?\s+/i);
  if (!a || !b) return null;
  const game = games.find(g => [a, b].every(n => g.competitors.some(c => teamMatches(n, c))));
  if (!game) return null;
  const winner = game.competitors.find(c => teamMatches(pick.pick, c));
  return winner ? { game, winnerId: winner.id } : null;
}

function matchPicks(picks, games) {
  const found = []; const missing = [];
  picks.forEach(p => { const m = findGame(p, games); m ? found.push({ pick: p, ...m }) : missing.push(p); });
  return { found, missing };
}

// The file's week numbers may be off by one from ESPN's, so try the neighbors too.
async function bestEspnWeek(fileWeek) {
  let best = null;
  for (const espnWeek of [fileWeek.week, fileWeek.week + 1, fileWeek.week - 1].filter(w => w >= 0 && w <= 16)) {
    const games = await fetchEspnGames(espnWeek, [80, 81]);
    const m = matchPicks(fileWeek.picks, games);
    if (!best || m.found.length > best.found.length) best = { espnWeek, ...m };
    if (m.missing.length === 0) break;
  }
  return best;
}

// Returns one report row per week: { week, espnWeek, matched, total, missing: [matchup], flagged }
export async function backfillPicks(file, onProgress) {
  const playerName = file.participant;
  const report = [];
  for (const fileWeek of file.weeks) {
    onProgress?.(`Matching Week ${fileWeek.week}…`);
    const best = await bestEspnWeek(fileWeek);
    const picksMap = {};
    best.found.forEach(({ pick, game, winnerId }) => { picksMap[game.id] = { winner: winnerId, confidence: pick.confidence }; });
    if (best.found.length) {
      await submitPicks(best.espnWeek, playerName, picksMap);
      const cfg = await getWeekConfig(best.espnWeek);
      if (!cfg.includedGameIds) await saveWeekConfig(best.espnWeek, best.found.map(f => f.game.id), cfg.deadlineIso);
    }
    report.push({
      week: fileWeek.week,
      espnWeek: best.espnWeek,
      matched: best.found.length,
      total: fileWeek.picks.length,
      missing: best.missing.map(p => p.matchup),
      flagged: fileWeek.picks.filter(p => p.needsReview).length
    });
  }
  return { playerName, report };
}
