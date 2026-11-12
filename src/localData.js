// Stand-in for firebase.js used by the frontend-preview build (`npm run build:cfp`), so the app
// works before Firebase/Firestore is set up. Same exports, same shapes — data just lives in
// this browser's localStorage, so nothing is shared between people or devices.
// vite.config.js swaps this in for firebase.js in "cfp" mode; the app code doesn't change.

const KEY = 'bb-local-data-v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
}
function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
}
function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'player';
}
const clone = v => (v == null ? v : JSON.parse(JSON.stringify(v)));

// ---- Weekly pool ----
export async function getWeekConfig(week) {
  const w = load().weeks?.[week];
  return { includedGameIds: w?.includedGameIds ?? null, deadlineIso: w?.deadlineIso ?? null };
}
export async function saveWeekConfig(week, includedGameIds, deadlineIso) {
  const d = load(); d.weeks = d.weeks || {};
  d.weeks[week] = { ...(d.weeks[week] || {}), includedGameIds: includedGameIds ?? null, deadlineIso: deadlineIso ?? null };
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

// ---- CFP bracket ----
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
