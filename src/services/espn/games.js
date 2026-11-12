import { ESPN_BASE } from './client.js';
import { fetchPollRankMap } from './rankings.js';
import { SEASON, CFP_SWITCH_WEEK, toEspnWeek, fromEspnWeek } from '@/config.js';
import { hexColor } from '@/shared/utils/colors.js';
import { formatKickoff } from '@/shared/utils/dates.js';

// Betting line from ESPN, when they have one (usually just the current week).
// → { spread: 'MICH -3.5', overUnder: 47.5 } or null
function parseLine(odds) {
  if (!odds) return null;
  const spread = odds.details || null;
  const overUnder = odds.overUnder ?? null;
  return spread || overUnder != null ? { spread, overUnder } : null;
}

// One POOL week's regular-season games. groups: 80 = FBS, 81 = FCS.
// Each game: { id, date, venue, status, state, completed, competitors: [away, home] }
export async function fetchEspnGames(week, groups = [80]) {
  const results = await Promise.all(groups.map(async groupId => {
    const response = await fetch(`${ESPN_BASE}/scoreboard?limit=500&dates=${SEASON}&seasontype=2&week=${toEspnWeek(week)}&groups=${groupId}`);
    if (!response.ok) throw new Error('Schedule unavailable');
    const data = await response.json();
    return data.events || [];
  }));
  const seen = new Set();
  const events = results.flat().filter(event => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
  return events.map(event => {
    const competition = event.competitions?.[0];
    const competitors = (competition?.competitors || []).map(entry => ({
      id: String(entry.team.id),
      name: entry.team.location || entry.team.displayName || entry.team.shortDisplayName || 'Team',
      homeAway: entry.homeAway || 'away',
      record: entry.records?.find(r => r.type === 'total')?.summary || '',
      color: hexColor(entry.team.color, '#5b5a55'),
      altColor: hexColor(entry.team.alternateColor, null),
      logo: entry.team.logo || '',
      rank: entry.curatedRank?.current || null,
      abbr: entry.team.abbreviation || '',
      // Every name ESPN uses for the team — for matching typed names like "UNC".
      altNames: [entry.team.displayName, entry.team.shortDisplayName, entry.team.abbreviation, entry.team.name].filter(Boolean),
      score: entry.score != null && entry.score !== '' ? Number(entry.score) : null,
      winner: entry.winner === true
    })).sort((a, b) => a.homeAway === 'away' ? -1 : b.homeAway === 'away' ? 1 : 0);

    return {
      id: String(event.id),
      date: event.date,
      venue: competition?.venue?.fullName || formatKickoff(event.date),
      status: event.status?.type?.shortDetail || 'Scheduled',
      state: event.status?.type?.state || 'pre',
      completed: event.status?.type?.completed === true,
      line: parseLine(competition?.odds?.[0]),
      competitors
    };
  }).filter(game => game.competitors.length === 2);
}

// Once the CFP committee starts publishing (after CFP_SWITCH_WEEK), its rankings replace the
// AP-style curatedRank on each team. If ESPN doesn't have the poll, this quietly does
// nothing and every game keeps the rank it already had.
export async function applyRankOverlay(gamesList, week) {
  if (week <= CFP_SWITCH_WEEK) return gamesList;
  const espnWeek = toEspnWeek(week);
  const cfpMap = (await fetchPollRankMap(espnWeek, 'cfp')) || (await fetchPollRankMap(espnWeek, 'playoff'));
  if (!cfpMap) return gamesList;
  gamesList.forEach(game => game.competitors.forEach(c => { if (cfpMap.has(c.id)) c.rank = cfpMap.get(c.id); }));
  return gamesList;
}

// ESPN's own status.shortDetail is pre-formatted in Eastern time — fine for a live game's
// clock, wrong for an upcoming kickoff, which should show in the viewer's own timezone.
export function gameStatusLabel(game) {
  if (game.completed) return 'FINAL';
  if (game.state === 'in') return game.status;
  return formatKickoff(game.date);
}

// The chip on the seam between the two teams: FINAL, or the live clock. Nothing before kickoff
// (the kickoff time shows above the pill instead).
export function matchupChip(game) {
  if (game.completed) return 'Final';
  if (game.state === 'in') return game.status;
  return null;
}

// Team id of the winner of a finished game, else null.
export function gameWinnerId(game) {
  if (!game.completed) return null;
  const flagged = game.competitors.find(c => c.winner);
  if (flagged) return flagged.id;
  const [a, b] = game.competitors;
  if (a.score == null || b.score == null || a.score === b.score) return null;
  return a.score > b.score ? a.id : b.id;
}

// The current POOL week (from ESPN's current week), or null (offseason / postseason / no answer).
export async function fetchCurrentWeek() {
  try {
    const response = await fetch(`${ESPN_BASE}/scoreboard?groups=80&limit=1`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.season?.type === 2 && data.week?.number ? fromEspnWeek(data.week.number) : null;
  } catch (e) {
    return null;
  }
}
