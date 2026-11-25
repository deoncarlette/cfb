import { load, save, clone } from './storage.js';
import { slugify } from '@/shared/utils/slugify.js';

export async function getPlayoffConfig(season) {
  const p = load().playoff?.[season] || {};
  return { seeds: p.seeds ?? [], lockIso: p.lockIso ?? null, results: p.results ?? {}, championshipTotal: p.championshipTotal ?? null };
}
export async function savePlayoffConfig(season, config) {
  const d = load(); d.playoff = d.playoff || {};
  d.playoff[season] = { ...(d.playoff[season] || {}), ...clone(config) };
  save(d);
}
export async function getMyBracket(season, userName) {
  return clone(load().brackets?.[season]?.[slugify(userName)] ?? null);
}
export async function submitBracket(season, userName, picks, tiebreaker) {
  const d = load(); d.brackets = d.brackets || {}; d.brackets[season] = d.brackets[season] || {};
  d.brackets[season][slugify(userName)] = {
    user_name: userName.trim(), picks: clone(picks),
    tiebreaker: tiebreaker === '' || tiebreaker == null ? null : Number(tiebreaker),
    submittedAt: new Date().toISOString()
  };
  save(d);
}
export async function getAllBrackets(season) {
  return Object.entries(load().brackets?.[season] || {}).map(([id, v]) => ({ id, ...v }));
}
