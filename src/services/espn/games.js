import { ESPN_BASE } from './client.js';
import { fetchPollRankMap } from './rankings.js';
import { SEASON, CFP_SWITCH_WEEK } from '@/config.js';
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

// "Week" key for the postseason: bowl games (and the CFP bracket, which has its own screen).
export const POSTSEASON = 'bowls';

function parseEvents(events) {
  const seen = new Set();
  return events.filter(event => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  }).map(event => {
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
      // Bowl / game name ESPN attaches, e.g. "Rose Bowl" or "CFP First Round".
      title: competition?.notes?.[0]?.headline || null,
      venue: competition?.venue?.fullName || formatKickoff(event.date),
      status: event.status?.type?.shortDetail || 'Scheduled',
      state: event.status?.type?.state || 'pre',
      completed: event.status?.type?.completed === true,
      line: parseLine(competition?.odds?.[0]),
      situation: parseSituation(competition?.situation),
      competitors
    };
  }).filter(game => game.competitors.length === 2);
}

// Live game situation: who has the ball, down & distance, red zone. null when not live.
function parseSituation(s) {
  if (!s || s.possession == null) return null;
  return {
    possession: String(s.possession),
    downDistance: s.downDistanceText || s.shortDownDistanceText || null,
    redZone: s.isRedZone === true
  };
}

// One week's regular-season games. groups: 80 = FBS, 81 = FCS.
// Each game: { id, date, title, venue, status, state, completed, line, competitors: [away, home] }
export async function fetchEspnGames(week, groups = [80]) {
  const results = await Promise.all(groups.map(async groupId => {
    const response = await fetch(`${ESPN_BASE}/scoreboard?limit=500&dates=${SEASON}&seasontype=2&week=${week}&groups=${groupId}`);
    if (!response.ok) throw new Error('Schedule unavailable');
    const data = await response.json();
    return data.events || [];
  }));
  return parseEvents(results.flat());
}

// CFP games (first round through the title game) — they belong to the bracket, not bowl picks.
export function isPlayoffGame(game) {
  return /playoff|cfp|national championship/i.test(game.title || '');
}

// All FBS bowl games (Dec–Jan), without the CFP games.
export async function fetchBowlGames() {
  const response = await fetch(`${ESPN_BASE}/scoreboard?limit=300&seasontype=3&dates=${SEASON}1201-${SEASON + 1}0131&groups=80`);
  if (!response.ok) throw new Error('Schedule unavailable');
  const data = await response.json();
  return parseEvents(data.events || []).filter(g => !isPlayoffGame(g));
}

// Games for a week number, or bowl games for POSTSEASON.
export function fetchGamesFor(week, groups) {
  return week === POSTSEASON ? fetchBowlGames() : fetchEspnGames(week, groups);
}

// Once the CFP committee starts publishing (after CFP_SWITCH_WEEK), its rankings replace the
// AP-style curatedRank on each team. If ESPN doesn't have the poll, this quietly does
// nothing and every game keeps the rank it already had.
export async function applyRankOverlay(gamesList, week) {
  if (typeof week !== 'number' || week <= CFP_SWITCH_WEEK) return gamesList;
  const cfpMap = (await fetchPollRankMap(week, 'cfp')) || (await fetchPollRankMap(week, 'playoff'));
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

// ESPN's current week: a regular-season week number, POSTSEASON during bowls/CFP, or null.
export async function fetchCurrentWeek() {
  try {
    const response = await fetch(`${ESPN_BASE}/scoreboard?groups=80&limit=1`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.season?.type === 3) return POSTSEASON;
    return data.season?.type === 2 && data.week?.number ? data.week.number : null;
  } catch (e) {
    return null;
  }
}
