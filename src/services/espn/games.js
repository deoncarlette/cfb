import { ESPN_BASE } from './client.js';
import { fetchPollRankMap } from './rankings.js';
import { SEASON, CFP_SWITCH_WEEK } from '@/config.js';
import { hexColor } from '@/shared/utils/colors.js';
import { formatKickoff, kickoffParts } from '@/shared/utils/dates.js';

// One week's regular-season games. groups: 80 = FBS, 81 = FCS.
// Each game: { id, date, venue, status, state, completed, competitors: [away, home] }
export async function fetchEspnGames(week, groups = [80]) {
  const results = await Promise.all(groups.map(async groupId => {
    const response = await fetch(`${ESPN_BASE}/scoreboard?limit=500&dates=${SEASON}&seasontype=2&week=${week}&groups=${groupId}`);
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
      logo: entry.team.logo || '',
      rank: entry.curatedRank?.current || null
    })).sort((a, b) => a.homeAway === 'away' ? -1 : b.homeAway === 'away' ? 1 : 0);

    return {
      id: String(event.id),
      date: event.date,
      venue: competition?.venue?.fullName || formatKickoff(event.date),
      status: event.status?.type?.shortDetail || 'Scheduled',
      state: event.status?.type?.state || 'pre',
      completed: event.status?.type?.completed === true,
      competitors
    };
  }).filter(game => game.competitors.length === 2);
}

// Once the CFP committee starts publishing (after CFP_SWITCH_WEEK), its rankings replace the
// AP-style curatedRank on each team. If ESPN doesn't have the poll, this quietly does
// nothing and every game keeps the rank it already had.
export async function applyRankOverlay(gamesList, week) {
  if (week <= CFP_SWITCH_WEEK) return gamesList;
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

// What goes in the little chip between the two teams: FINAL, the live clock, or kickoff.
export function matchupChip(game) {
  if (game.completed) return { top: 'Final', bottom: '' };
  if (game.state === 'in') return { top: 'Live', bottom: game.status };
  const { day, time } = kickoffParts(game.date);
  return { top: time, bottom: day };
}
