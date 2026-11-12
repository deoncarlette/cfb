import { ESPN_BASE } from './client.js';
import { hexColor } from '@/shared/utils/colors.js';

const pollLabel = p => `${p.shortName || ''} ${p.name || ''} ${p.type || ''}`.toLowerCase();

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

// Latest published rankings (no week param = ESPN's current set). Prefers the CFP committee
// poll and falls back to AP before the committee starts publishing. Returns
// { pollName, isCfp, teams: [...] } sorted by rank, or null if ESPN doesn't answer.
export async function fetchCurrentRankings() {
  try {
    const response = await fetch(`${ESPN_BASE}/rankings`);
    if (!response.ok) return null;
    const data = await response.json();
    const polls = data.rankings || [];
    const poll = polls.find(p => pollLabel(p).includes('cfp') || pollLabel(p).includes('playoff'))
      || polls.find(p => pollLabel(p).includes('ap'))
      || polls[0];
    if (!poll?.ranks?.length) return null;
    const teams = poll.ranks.map(teamFromRankEntry).filter(t => t.id && t.id !== 'undefined')
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
    return { pollName: poll.shortName || poll.name || 'Rankings', isCfp: /cfp|playoff/.test(pollLabel(poll)), teams };
  } catch (e) {
    return null;
  }
}
