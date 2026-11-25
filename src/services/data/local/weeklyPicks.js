import { withPreset } from '../weekPresets.js';
import { load, save, clone } from './storage.js';
import { slugify } from '@/shared/utils/slugify.js';

export async function getWeekConfig(week) {
  const w = load().weeks?.[week];
  return withPreset(week, { includedGameIds: w?.includedGameIds ?? null, deadlineIso: w?.deadlineIso ?? null, lockMode: w?.lockMode === 'kickoff' ? 'kickoff' : 'slate' });
}
// Forget a week's saved settings: it goes back to its loaded slate (or the defaults).
export async function clearWeekConfig(week) {
  const d = load(); if (d.weeks) delete d.weeks[week]; save(d);
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

// Commish defaults for new weeks: { teams: [{ id, name }], categories: [...] } or null.
export async function getSlateDefaults() {
  return clone(load().slateDefaults ?? null);
}
export async function saveSlateDefaults(defaults) {
  const d = load(); d.slateDefaults = defaults; save(d);
}
