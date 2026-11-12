import { getAllPicksForWeek } from '@/services/data/index.js';
import { SEASON_ROSTER, WEEKLY_SCORE_SEED } from './seedData.js';

export function knownScoredWeeks() {
  return Object.keys(WEEKLY_SCORE_SEED).map(Number).sort((a, b) => a - b);
}

// NOTE: there's no picks-vs-results scoring engine yet — nothing compares a submitted pick
// against a game's actual winner. Weeks 0-2 show real recap totals (WEEKLY_SCORE_SEED);
// any other week shows real submission status (Submitted/not yet) with no score, same as
// the Canva prototype this was ported from.
export async function recordsForWeek(week) {
  const seed = WEEKLY_SCORE_SEED[week];
  if (seed) return SEASON_ROSTER.map(name => ({ user_name: name, score: seed[name] ?? 0 }));
  const picks = await getAllPicksForWeek(week);
  const submitted = new Set(picks.map(p => p.user_name));
  const rows = picks.map(p => ({ user_name: p.user_name, score: undefined, submitted: true }));
  SEASON_ROSTER.filter(n => !submitted.has(n)).forEach(n => rows.push({ user_name: n, score: undefined, submitted: false }));
  return rows;
}

export async function computeOverallStandings(throughWeek) {
  const totals = new Map(SEASON_ROSTER.map(name => [name, { user_name: name, score: 0, weeksScored: 0 }]));
  const weeks = knownScoredWeeks().filter(w => w <= throughWeek);
  for (const w of weeks) {
    const rows = await recordsForWeek(w);
    rows.forEach(r => {
      if (r.score === undefined) return;
      const entry = totals.get(r.user_name) || { user_name: r.user_name, score: 0, weeksScored: 0 };
      entry.score += Number(r.score) || 0; entry.weeksScored += 1;
      totals.set(r.user_name, entry);
    });
  }
  return [...totals.values()];
}

export function rankMap(records) {
  const sorted = [...records].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const m = new Map(); sorted.forEach((r, i) => m.set(r.user_name, i + 1)); return m;
}
