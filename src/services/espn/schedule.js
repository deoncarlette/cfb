import { ESPN_BASE } from './client.js';
import { SEASON } from '@/config.js';

// A team's finished games this season (regular season + postseason), from ESPN's team schedule.
// → [{ date, opp: { id, name, abbr, logo }, us, them, won }] — cached per team.
const cache = new Map();
const num = s => (s == null ? null : typeof s === 'object' ? Number(s.value ?? s.displayValue) : Number(s));

export function fetchTeamResults(teamId) {
  const key = String(teamId);
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      const lists = await Promise.all([2, 3].map(st =>
        fetch(`${ESPN_BASE}/teams/${key}/schedule?season=${SEASON}&seasontype=${st}`)
          .then(r => (r.ok ? r.json() : { events: [] })).then(d => d.events || []).catch(() => [])));
      return lists.flat().map(e => {
        const c = e.competitions?.[0];
        if (!c?.status?.type?.completed) return null;
        const me = c.competitors?.find(x => String(x.team?.id ?? x.id) === key);
        const op = c.competitors?.find(x => String(x.team?.id ?? x.id) !== key);
        const us = num(me?.score), them = num(op?.score);
        if (!me || !op || us == null || them == null || Number.isNaN(us) || Number.isNaN(them)) return null;
        const t = op.team || {};
        return { date: e.date, opp: { id: String(t.id ?? op.id), name: t.location || t.shortDisplayName || t.displayName || 'Opponent', abbr: t.abbreviation || '', logo: t.logos?.[0]?.href || t.logo || '' }, us, them, won: me.winner ?? us > them };
      }).filter(Boolean).sort((a, b) => new Date(a.date) - new Date(b.date));
    })().catch(() => { cache.delete(key); return []; }));
  }
  return cache.get(key);
}

// Opponents both teams have played (not each other), with each side's results against them.
// → [{ opp, away: [result], home: [result] }] in the order the away team played them.
export async function commonOpponents(awayId, homeId) {
  const [a, h] = await Promise.all([fetchTeamResults(awayId), fetchTeamResults(homeId)]);
  const skip = new Set([String(awayId), String(homeId)]);
  const homeBy = new Map();
  h.forEach(g => { if (!skip.has(g.opp.id)) homeBy.set(g.opp.id, [...(homeBy.get(g.opp.id) || []), g]); });
  const out = new Map();
  a.forEach(g => {
    if (skip.has(g.opp.id) || !homeBy.has(g.opp.id)) return;
    const row = out.get(g.opp.id) || { opp: g.opp, away: [], home: homeBy.get(g.opp.id) };
    row.away.push(g); out.set(g.opp.id, row);
  });
  return [...out.values()];
}
