import { SEASON } from '@/config.js';

// Unsubmitted picks kept on this device, so a refresh (to check scores) doesn't wipe them.
// One draft per week: { winners: { gameId: teamId }, order: [gameId…], savedAt }.
// Submitting clears it — once picks are submitted, the saved entry is the source of truth.
const keyFor = week => `picks-draft:${SEASON}:${week}`;

export function loadDraft(week) {
  try { const raw = localStorage.getItem(keyFor(week)); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
export function saveDraft(week, winners, order) {
  const draft = { winners, order, savedAt: Date.now() };
  try { localStorage.setItem(keyFor(week), JSON.stringify(draft)); } catch (e) {}
  return draft;
}
export function clearDraft(week) {
  try { localStorage.removeItem(keyFor(week)); } catch (e) {}
}
