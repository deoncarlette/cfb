import { ESPN_BASE } from './client.js';
import { hexColor } from '@/shared/utils/colors.js';
import { CFP_SWITCH_WEEK } from '@/config.js';

const pollLabel = p => `${p.shortName || ''} ${p.name || ''} ${p.type || ''}`.toLowerCase();
const isCfpPoll = p => /cfp|playoff/.test(pollLabel(p));
const isApPoll = p => /\bap\b/.test(pollLabel(p)) && !isCfpPoll(p);
const isCoachesPoll = p => /coach|afca|usa today/.test(pollLabel(p));

// Every poll ESPN has for a week (week null = its latest set), cached. [] if unavailable.
const pollsCache = new Map();
function pollsFor(week) {
  const key = week ?? 'latest';
  if (!pollsCache.has(key)) {
    pollsCache.set(key, fetch(`${ESPN_BASE}/rankings${week == null ? '' : `?week=${week}&seasontype=2`}`)
      .then(r => (r.ok ? r.json() : { rankings: [] }))
      .then(d => d.rankings || [])
      .catch(() => { pollsCache.delete(key); return []; }));
  }
  return pollsCache.get(key);
}

// From the first CFP week on, the committee's poll is the ranking — never AP. This finds the CFP
// poll for a week, or the most recent earlier one when this week's isn't out yet (it comes out
// Tuesday nights). → { poll, week } or null (before the first CFP poll, or ESPN unreachable).
const cfpCache = new Map();
export function cfpPollAtOrBefore(week) {
  if (typeof week !== 'number' || week < CFP_SWITCH_WEEK) return Promise.resolve(null);
  if (!cfpCache.has(week)) {
    cfpCache.set(week, (async () => {
      for (let w = week; w >= CFP_SWITCH_WEEK; w--) {
        const poll = (await pollsFor(w)).find(isCfpPoll);
        if (poll?.ranks?.length) return { poll, week: w };
      }
      return null;
    })());
  }
  return cfpCache.get(week);
}

// Every poll's rank for a week, for showing them side by side: { cfp, ap, coaches } (each a
// Map teamId → rank, or null) plus cfpWeek (the week the CFP ranks are from — earlier than
// `week` when this week's aren't out yet).
export async function pollRanksFor(week) {
  const polls = await pollsFor(typeof week === 'number' ? week : null);
  const ranks = poll => (poll?.ranks?.length ? new Map(poll.ranks.filter(e => e.team?.id).map(e => [String(e.team.id), e.current])) : null);
  const cfpHit = typeof week === 'number' ? await cfpPollAtOrBefore(week) : (polls.find(isCfpPoll) ? { poll: polls.find(isCfpPoll), week: null } : null);
  return { cfp: ranks(cfpHit?.poll), cfpWeek: cfpHit?.week ?? null, ap: ranks(polls.find(isApPoll)), coaches: ranks(polls.find(isCoachesPoll)) };
}

// Map of teamId → rank for one poll in one week, or null if ESPN doesn't have it.
// keyword picks the poll, e.g. 'cfp' or 'playoff'.
export async function fetchPollRankMap(week, keyword) {
  try {
    const response = await fetch(`${ESPN_BASE}/rankings?week=${week}&seasontype=2`);
    if (!response.ok) return null;
    const data = await response.json();
    const poll = (data.rankings || []).find(p => pollLabel(p).includes(keyword));
    if (!poll || !poll.ranks) return null;
    const map = new Map();
    poll.ranks.forEach(entry => { if (entry.team?.id) map.set(String(entry.team.id), entry.current); });
    return map.size ? map : null;
  } catch (e) {
    return null;
  }
}

// Every poll for a week, as comparable scores (higher = better), for "Higher ranked":
//   cfp:     rank → 100 − rank (the committee publishes no points)
//   ap, coaches: poll points, including teams "receiving votes" outside the top 25
// → { cfp, ap, coaches } (each a Map teamId → score, or null), cached per week. week null =
// ESPN's latest set.
const pollCache = new Map();
export function fetchPollScores(week) {
  const key = week ?? 'latest';
  if (!pollCache.has(key)) {
    pollCache.set(key, (async () => {
      const q = week == null ? '' : `?week=${week}&seasontype=2`;
      const response = await fetch(`${ESPN_BASE}/rankings${q}`);
      if (!response.ok) throw new Error('rankings');
      const polls = (await response.json()).rankings || [];
      const find = test => polls.find(p => test(pollLabel(p)));
      const byRank = poll => poll?.ranks?.length ? new Map(poll.ranks.filter(e => e.team?.id).map(e => [String(e.team.id), 100 - e.current])) : null;
      const byPoints = poll => {
        if (!poll) return null;
        const map = new Map();
        [...(poll.ranks || []), ...(poll.others || [])].forEach(e => { if (e.team?.id) map.set(String(e.team.id), Number(e.points) || 0); });
        return map.size ? map : null;
      };
      // No CFP poll this week yet → the latest earlier one (never AP in its place).
      const cfpPoll = find(l => /cfp|playoff/.test(l)) || (await cfpPollAtOrBefore(week))?.poll;
      return {
        cfp: byRank(cfpPoll),
        ap: byPoints(find(l => /\bap\b/.test(l) && !/cfp|playoff/.test(l))),
        coaches: byPoints(find(l => /coach|afca|usa today/.test(l)))
      };
    })().catch(e => { pollCache.delete(key); return { cfp: null, ap: null, coaches: null }; }));
  }
  return pollCache.get(key);
}

function teamFromRankEntry(entry) {
  const t = entry.team || {};
  return {
    id: String(t.id),
    name: t.location || t.nickname || t.displayName || t.name || 'Team',
    abbr: t.abbreviation || '',
    logo: t.logo || t.logos?.[0]?.href || '',
    color: hexColor(t.color, '#5b5a55'),
    altColor: hexColor(t.alternateColor, null),
    record: entry.recordSummary || '',
    rank: entry.current ?? null
  };
}

// Latest published rankings (no week param = ESPN's current set). The CFP committee poll —
// from currentWeek on (a week number, or 'postseason'), the most recent CFP poll even when the
// latest set doesn't have one yet; AP only before the committee starts publishing. Returns
// { pollName, isCfp, teams: [...] } sorted by rank, or null if ESPN doesn't answer.
export async function fetchCurrentRankings(currentWeek = null) {
  try {
    const polls = await pollsFor(null);
    let poll = polls.find(isCfpPoll);
    let fromWeek = null;
    if (!poll && currentWeek != null) {
      const hit = await cfpPollAtOrBefore(typeof currentWeek === 'number' ? currentWeek : 17);
      poll = hit?.poll; fromWeek = hit?.week ?? null;
    }
    const cfpSeason = typeof currentWeek !== 'number' || currentWeek >= CFP_SWITCH_WEEK;
    if (!poll && cfpSeason && currentWeek != null) return null; // no CFP to project from; never AP
    poll ||= polls.find(p => pollLabel(p).includes('ap')) || polls[0];
    if (!poll?.ranks?.length) return null;
    const teams = poll.ranks.map(teamFromRankEntry).filter(t => t.id && t.id !== 'undefined')
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
    const name = poll.shortName || poll.name || 'Rankings';
    return { pollName: fromWeek != null ? `${name} (Week ${fromWeek}; this week's isn't out yet)` : name, isCfp: isCfpPoll(poll), teams };
  } catch (e) {
    return null;
  }
}
