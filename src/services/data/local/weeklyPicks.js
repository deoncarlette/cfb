import { load, save, clone } from './storage.js';
import { slugify } from '@/shared/utils/slugify.js';

export async function getWeekConfig(week) {
  const w = load().weeks?.[week];
  return { includedGameIds: w?.includedGameIds ?? null, deadlineIso: w?.deadlineIso ?? null, lockMode: w?.lockMode === 'kickoff' ? 'kickoff' : 'slate' };
}
export async function saveWeekConfig(week, includedGameIds, deadlineIso, lockMode = 'slate') {
  const d = load(); d.weeks = d.weeks || {};
  d.weeks[week] = { ...(d.weeks[week] || {}), includedGameIds: includedGameIds ?? null, deadlineIso: deadlineIso ?? null, lockMode: lockMode === 'kickoff' ? 'kickoff' : 'slate' };
  save(d);
}
export async function getMyPicks(week, userName) {
  return clone(load().picks?.[week]?.[slugify(userName)] ?? null);
}
export async function submitPicks(week, userName, picksMap) {
  const d = load(); d.picks = d.picks || {}; d.picks[week] = d.picks[week] || {};
  d.picks[week][slugify(userName)] = { user_name: userName, picks: picksMap, submittedAt: new Date().toISOString() };
  save(d);
}
export async function getAllPicksForWeek(week) {
  return Object.entries(load().picks?.[week] || {}).map(([id, v]) => ({ id, ...v }));
}
