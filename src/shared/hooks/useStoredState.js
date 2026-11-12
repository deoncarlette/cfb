import { useState } from 'react';

// useState that's remembered in this browser (e.g. the name you typed). Falls back to plain
// state if storage is blocked.
export function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    try { const v = localStorage.getItem(key); return v != null ? JSON.parse(v) : initial; } catch (e) { return initial; }
  });
  function set(next) {
    setValue(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch (e) {}
  }
  return [value, set];
}
