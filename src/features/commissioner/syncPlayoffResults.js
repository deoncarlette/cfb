import { fetchPlayoffResults } from '@/services/espn/index.js';
import { GAMES, participants, pruneInvalidPicks } from '@/features/bracket/bracketLogic.js';

// Fills in bracket results from ESPN. Walks round by round, so a newly found quarterfinal
// result can unlock its semifinal lookup. Returns { results, championshipTotal }.
export async function syncPlayoffResults(results, bySeed, championshipTotal) {
  let next = { ...results }; let total = championshipTotal;
  for (let pass = 0; pass < 4; pass++) {
    const matchups = GAMES.map(g => ({ key: g.key, teams: participants(g.key, bySeed, next) }))
      .filter(m => m.teams.every(Boolean) && !next[m.key]);
    if (!matchups.length) break;
    const found = await fetchPlayoffResults(matchups);
    if (!Object.keys(found.results).length) break;
    next = pruneInvalidPicks({ ...next, ...found.results }, bySeed);
    if (found.championshipTotal != null) total = found.championshipTotal;
  }
  return { results: next, championshipTotal: total };
}
