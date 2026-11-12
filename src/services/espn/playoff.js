import { ESPN_BASE } from './client.js';
import { SEASON } from '@/config.js';

// Best-effort: scans ESPN's postseason scoreboard and returns { gameKey: winnerTeamId } for
// every bracket game whose two real teams have a completed matchup. `matchups` is
// [{ key, teams: [idA, idB] }] for games whose participants are already known. Also returns
// the title game's combined score (for the tiebreaker) when it's final.
export async function fetchPlayoffResults(matchups) {
  const response = await fetch(`${ESPN_BASE}/scoreboard?limit=300&seasontype=3&dates=${SEASON}1201-${SEASON + 1}0131&groups=80`);
  if (!response.ok) throw new Error('Postseason scoreboard unavailable');
  const data = await response.json();
  const finals = (data.events || []).map(event => {
    const comp = event.competitions?.[0];
    const sides = (comp?.competitors || []).map(c => ({ id: String(c.team?.id), score: Number(c.score) || 0, winner: c.winner === true }));
    return { completed: event.status?.type?.completed === true, sides };
  }).filter(e => e.completed && e.sides.length === 2);

  const results = {};
  let championshipTotal = null;
  matchups.forEach(({ key, teams }) => {
    const match = finals.find(f => teams.every(id => f.sides.some(s => s.id === id)));
    if (!match) return;
    const winner = match.sides.find(s => s.winner) || [...match.sides].sort((a, b) => b.score - a.score)[0];
    results[key] = winner.id;
    if (key === 'nc') championshipTotal = match.sides[0].score + match.sides[1].score;
  });
  return { results, championshipTotal };
}
