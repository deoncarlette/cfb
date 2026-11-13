import { getAllPicksForWeek } from '@/services/data/index.js';
import { REPLAY_WEEK } from '@/config.js';
import { fetchGamesFor, applyRankOverlay, gameWinnerId } from '@/services/espn/index.js';
import { replayGames, loadReplaySummaries } from '@/services/espn/replay.js';
import { samplePicksForWeek } from '@/features/picks/sample/samplePicks.js';
import mock from './mockScores.json';

// Weekly scores come from mockScores.json (recorded/reconciled weeks 0–10, made-up Week 11)
// until there's a real engine scoring every player's picks against results. Weeks not in the
// file show who has submitted picks so far.

export const SEASON_ROSTER = mock.players.map(p => p.name);
const mockWeek = week => mock.weeks.find(w => w.week === week);

// { possible, isSample } for the week's header, or null if the file doesn't have it.
export function weekInfo(week) {
  const w = mockWeek(week);
  return w ? { possible: w.possiblePoints, isSample: w.standings.some(s => s.isMock) } : null;
}

// ---- The test replay week scores itself live ----
// Everyone's picks from the sample file, scored against the replayed games that have gone
// final so far — so the scoreboard climbs as games finish. (The evening re-run of the morning
// games isn't special-cased: those games read as not started until they replay.)
let replayRaw = null;
async function replayedGames() {
  replayRaw ||= fetchGamesFor(REPLAY_WEEK, [80, 81])
    .then(gs => applyRankOverlay(gs, REPLAY_WEEK))
    .then(async gs => { await loadReplaySummaries(gs); return gs; })
    .catch(e => { replayRaw = null; throw e; });
  return replayGames(await replayRaw);
}

export const isLiveScoredWeek = week => REPLAY_WEEK != null && week === REPLAY_WEEK;

// { rows: [{ user_name, score, entered }], final, total } — final = games finished so far.
async function replayRecords() {
  const games = await replayedGames();
  const sample = await samplePicksForWeek(REPLAY_WEEK, games);
  const slate = sample ? games.filter(g => sample.gameIds.includes(g.id)) : [];
  const winners = new Map(slate.map(g => [g.id, gameWinnerId(g)]).filter(([, w]) => w));
  const norm = s => s.trim().toLowerCase();
  const names = new Map(SEASON_ROSTER.map(n => [norm(n), n]));
  sample?.ballots.forEach(b => { if (!names.has(norm(b.user_name))) names.set(norm(b.user_name), b.user_name); });
  const rows = [...names.entries()].map(([key, name]) => {
    const ballot = sample?.ballots.get(key);
    if (!ballot) return { user_name: name, score: 0, entered: false };
    let score = 0;
    Object.entries(ballot.picks).forEach(([gid, p]) => { if (winners.get(gid) === p.winner) score += Number(p.confidence) || 0; });
    return { user_name: name, score, entered: true };
  });
  return { rows, final: winners.size, total: slate.length };
}

// Live progress line for the replay week: { final, total } or null.
export async function replayProgress(week) {
  if (!isLiveScoredWeek(week)) return null;
  const { final, total } = await replayRecords();
  return { final, total };
}

async function weekRows(week) {
  if (isLiveScoredWeek(week)) {
    try { return (await replayRecords()).rows; } catch (e) { /* ESPN unreachable → recorded scores */ }
  }
  const w = mockWeek(week);
  return w ? w.standings.map(s => ({ user_name: s.userName, score: s.weeklyScore, entered: s.entered })) : null;
}

// Rows: { user_name, score, entered } — entered === false means they didn't play that week.
export async function recordsForWeek(week) {
  if (isLiveScoredWeek(week)) { const rows = await weekRows(week); if (rows) return rows; }
  const w = mockWeek(week);
  if (w) return w.standings.map(s => ({ user_name: s.userName, score: s.weeklyScore, entered: s.entered }));
  const picks = await getAllPicksForWeek(week);
  const submitted = new Set(picks.map(p => p.user_name));
  const rows = picks.map(p => ({ user_name: p.user_name, score: undefined, submitted: true }));
  SEASON_ROSTER.filter(n => !submitted.has(n)).forEach(n => rows.push({ user_name: n, score: undefined, submitted: false }));
  return rows;
}

// Season totals through a week (sum of every scored week up to it).
export async function computeOverallStandings(throughWeek) {
  const totals = new Map(SEASON_ROSTER.map(name => [name, { user_name: name, score: 0 }]));
  for (const w of mock.weeks.filter(w => w.week <= throughWeek)) {
    const rows = await weekRows(w.week);
    rows.forEach(s => {
      const entry = totals.get(s.user_name) || { user_name: s.user_name, score: 0 };
      entry.score += Number(s.score) || 0;
      totals.set(s.user_name, entry);
    });
  }
  return [...totals.values()];
}

// Ties share a rank: 486, 486, 484 → 1, 1, 3.
export function rankOf(score, allScores) {
  return 1 + allScores.filter(s => s > score).length;
}

export function rankMap(records) {
  const scores = records.map(r => r.score ?? -1);
  return new Map(records.map(r => [r.user_name, rankOf(r.score ?? -1, scores)]));
}
