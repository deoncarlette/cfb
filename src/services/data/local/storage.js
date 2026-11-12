// Everything the local (no-Firebase) data layer saves lives under one localStorage key.
const KEY = 'bb-local-data-v1';

export function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
}
export function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
}
export const clone = v => (v == null ? v : JSON.parse(JSON.stringify(v)));
