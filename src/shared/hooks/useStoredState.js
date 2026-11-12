import { useState } from 'react';

// useState that's remembered in this browser. storage: 'local' (default — kept across visits,
// e.g. your name) or 'session' (kept through a reload of this tab only, e.g. which tab you're on).
// Falls back to plain state if storage is blocked.
export function useStoredState(key, initial, storage = 'local') {
  const store = () => (storage === 'session' ? sessionStorage : localStorage);
  const [value, setValue] = useState(() => {
    try { const v = store().getItem(key); return v != null ? JSON.parse(v) : initial; } catch (e) { return initial; }
  });
  function set(next) {
    setValue(next);
    try { store().setItem(key, JSON.stringify(next)); } catch (e) {}
  }
  return [value, set];
}
