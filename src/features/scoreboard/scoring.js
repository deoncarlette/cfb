import { getAllPicksForWeek } from '@/services/data/index.js';
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

// Rows: { user_name, score, entered } — entered === false means they didn't play that week.
export async function recordsForWeek(week) {
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
    w.standings.forEach(s => {
      const entry = totals.get(s.userName) || { user_name: s.userName, score: 0 };
      entry.score += Number(s.weeklyScore) || 0;
      totals.set(s.userName, entry);
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
