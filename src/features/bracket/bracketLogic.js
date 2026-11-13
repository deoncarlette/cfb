// Pure bracket logic for the 12-team College Football Playoff — no React, no Firebase, so it
// can be unit-tested on its own and shared by the Bracket screen and the Commissioner panel.
//
// 2026-27 format: 12 teams. Five automatic bids — the ACC, Big Ten, Big 12 and SEC champions
// and the highest-ranked Group of Six champion — plus Notre Dame if it's in the top 12; the
// rest are at-large. All 12 are seeded straight by ranking. Seeds 1-4 get first-round byes,
// NO re-seeding. That makes the bracket fixed the moment seeds are known:
//   First round (higher seed hosts):  5v12, 8v9, 6v11, 7v10
//   Quarterfinals:                     1 v 8/9,  4 v 5/12,  3 v 6/11,  2 v 7/10
//   Semifinals:                        (1 side) v (4 side),  (3 side) v (2 side)
//   National Championship

import { SEC_TEAMS, BIG_TEN_TEAMS, BIG_12_TEAMS, ACC_TEAMS } from '@/services/espn/teams.js';

// Independents can't win a conference title (Notre Dame has its own top-12 guarantee).
const INDEPENDENTS = new Set(['Notre Dame', 'UConn', 'Connecticut']);
function bidConference(name) {
  if (SEC_TEAMS.has(name)) return 'SEC';
  if (BIG_TEN_TEAMS.has(name)) return 'Big Ten';
  if (BIG_12_TEAMS.has(name)) return 'Big 12';
  if (ACC_TEAMS.has(name)) return 'ACC';
  return INDEPENDENTS.has(name) ? null : 'Group of Six';
}

// The projected 12-team field from a ranking (teams sorted best first): each Power 4
// conference's top-ranked team and the top-ranked Group of Six team (stand-ins for the
// conference champions), Notre Dame if it's top 12, then the best-ranked at-large teams.
// Seeded straight by ranking. Each team gets autoBid: the conference it's projected to win.
export function projectField(teams) {
  const auto = new Map();
  teams.forEach(t => { const c = bidConference(t.name); if (c && !auto.has(c)) auto.set(c, t.id); });
  const autoBid = new Map([...auto].map(([c, id]) => [id, c]));
  const field = new Set(auto.values());
  const nd = teams.slice(0, 12).find(t => t.name === 'Notre Dame');
  if (nd) field.add(nd.id);
  for (const t of teams) { if (field.size >= 12) break; field.add(t.id); }
  return teams.filter(t => field.has(t.id)).slice(0, 12)
    .map((t, i) => ({ ...t, seed: i + 1, autoBid: autoBid.get(t.id) || null }));
}

export const ROUNDS = [
  { id: 'r1', label: 'First Round', short: 'R1' },
  { id: 'qf', label: 'Quarterfinals', short: 'QF' },
  { id: 'sf', label: 'Semifinals', short: 'SF' },
  { id: 'nc', label: 'Championship', short: 'Title' }
];

// Doubles each round, March Madness style. Max possible = 4*10 + 4*20 + 2*40 + 80 = 280.
// Change these freely — every score is computed live from this table, nothing is stored.
export const ROUND_POINTS = { r1: 10, qf: 20, sf: 40, nc: 80 };

// Listed in dependency order (a game only ever feeds games below it), which lets
// pruneInvalidPicks and the participant resolver work in a single top-to-bottom pass.
// `side` is which half of the bracket the game sits on, for the symmetric desktop layout.
export const GAMES = [
  { key: 'r1b', round: 'r1', side: 'L', top: { seed: 8 }, bottom: { seed: 9 } },
  { key: 'r1a', round: 'r1', side: 'L', top: { seed: 5 }, bottom: { seed: 12 } },
  { key: 'r1c', round: 'r1', side: 'R', top: { seed: 6 }, bottom: { seed: 11 } },
  { key: 'r1d', round: 'r1', side: 'R', top: { seed: 7 }, bottom: { seed: 10 } },
  { key: 'qf1', round: 'qf', side: 'L', top: { seed: 1 }, bottom: { from: 'r1b' } },
  { key: 'qf2', round: 'qf', side: 'L', top: { seed: 4 }, bottom: { from: 'r1a' } },
  { key: 'qf3', round: 'qf', side: 'R', top: { seed: 3 }, bottom: { from: 'r1c' } },
  { key: 'qf4', round: 'qf', side: 'R', top: { seed: 2 }, bottom: { from: 'r1d' } },
  { key: 'sf1', round: 'sf', side: 'L', top: { from: 'qf1' }, bottom: { from: 'qf2' } },
  { key: 'sf2', round: 'sf', side: 'R', top: { from: 'qf3' }, bottom: { from: 'qf4' } },
  { key: 'nc', round: 'nc', side: 'C', top: { from: 'sf1' }, bottom: { from: 'sf2' } }
];

export const GAME_BY_KEY = Object.fromEntries(GAMES.map(g => [g.key, g]));
export const CHAMPIONSHIP_KEY = 'nc';

// seeds: array of team objects, each with a `seed` (1-12) and `id` (ESPN team id).
export function seedMap(seeds) {
  return Object.fromEntries((seeds || []).filter(t => t && t.seed).map(t => [t.seed, t]));
}

// Which team id fills a slot, given a map of already-decided winners (a player's picks, or the
// real results). Returns null when the feeder game isn't decided yet.
function resolveSlot(slot, bySeed, winners) {
  if (slot.seed) return bySeed[slot.seed]?.id ?? null;
  return winners[slot.from] ?? null;
}

export function participants(gameKey, bySeed, winners) {
  const g = GAME_BY_KEY[gameKey];
  return [resolveSlot(g.top, bySeed, winners), resolveSlot(g.bottom, bySeed, winners)];
}

// Human label for a not-yet-decided slot, e.g. "Winner 8/9".
export function slotPlaceholder(slot) {
  if (slot.seed) return `Seed ${slot.seed}`;
  const feeder = GAME_BY_KEY[slot.from];
  if (feeder.round === 'r1') return `Winner ${feeder.top.seed}/${feeder.bottom.seed}`;
  return feeder.round === 'qf' ? 'Quarterfinal winner' : 'Semifinal winner';
}

// After a pick changes, any later pick whose team is no longer in that game gets cleared —
// e.g. switching your 8/9 winner wipes a QF/SF/Title pick that relied on the old team.
export function pruneInvalidPicks(picks, bySeed) {
  const next = { ...picks };
  for (const g of GAMES) {
    if (!next[g.key]) continue;
    if (!participants(g.key, bySeed, next).includes(next[g.key])) delete next[g.key];
  }
  return next;
}

export function setPick(picks, gameKey, teamId, bySeed) {
  return pruneInvalidPicks({ ...picks, [gameKey]: teamId }, bySeed);
}

// Pick a team, or clear the pick (and anything that depended on it) if it was already picked.
export function togglePick(picks, gameKey, teamId, bySeed) {
  if (picks[gameKey] !== teamId) return setPick(picks, gameKey, teamId, bySeed);
  const next = { ...picks }; delete next[gameKey];
  return pruneInvalidPicks(next, bySeed);
}

export function isComplete(picks) {
  return GAMES.every(g => !!picks[g.key]);
}

// Teams knocked out by real results. Uses the ACTUAL participants of each decided game, so a
// player's wrong earlier pick doesn't confuse who really lost.
export function eliminatedTeams(results, bySeed) {
  const out = new Set();
  for (const g of GAMES) {
    const winner = results[g.key];
    if (!winner) continue;
    participants(g.key, bySeed, results).forEach(id => { if (id && id !== winner) out.add(id); });
  }
  return out;
}

// Per-game status of a player's pick: 'correct' | 'wrong' | 'dead' (pick already eliminated,
// game not played yet) | 'pending' | 'empty'.
export function pickStatus(gameKey, picks, results, eliminated) {
  const pick = picks[gameKey];
  if (!pick) return 'empty';
  const actual = results[gameKey];
  if (actual) return actual === pick ? 'correct' : 'wrong';
  return eliminated.has(pick) ? 'dead' : 'pending';
}

export function scoreBracket(picks, results, bySeed) {
  const eliminated = eliminatedTeams(results, bySeed);
  let score = 0; let possible = 0; let correct = 0;
  for (const g of GAMES) {
    const pts = ROUND_POINTS[g.round];
    const status = pickStatus(g.key, picks, results, eliminated);
    if (status === 'correct') { score += pts; possible += pts; correct += 1; }
    else if (status === 'pending') possible += pts;
  }
  return { score, possible, correct };
}

export const MAX_POINTS = GAMES.reduce((sum, g) => sum + ROUND_POINTS[g.round], 0);

// Standings sort: points, then max-possible, then closest championship-total tiebreaker
// (only once the title game's real total is known).
export function rankBrackets(entries, results, bySeed, actualTotal) {
  const rows = entries.map(e => {
    const s = scoreBracket(e.picks || {}, results, bySeed);
    const tbDiff = actualTotal != null && e.tiebreaker != null ? Math.abs(Number(e.tiebreaker) - actualTotal) : null;
    return { ...e, ...s, tbDiff };
  });
  rows.sort((a, b) =>
    b.score - a.score ||
    b.possible - a.possible ||
    (a.tbDiff ?? Infinity) - (b.tbDiff ?? Infinity) ||
    a.user_name.localeCompare(b.user_name)
  );
  return rows;
}
