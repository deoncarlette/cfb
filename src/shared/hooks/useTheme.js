import { useEffect, useState } from 'react';

// Light/dark. Follows the device setting until you tap the toggle; your choice is saved only
// while it differs from the device, so switching back to match it returns to following it.
const KEY = 'theme-pref';
const mq = () => window.matchMedia('(prefers-color-scheme: light)');
const systemTheme = () => (mq().matches ? 'light' : 'dark');
function savedTheme() {
  try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : null; } catch (e) { return null; }
}

export function useTheme() {
  const [saved, setSaved] = useState(savedTheme);
  const [system, setSystem] = useState(systemTheme);
  useEffect(() => {
    const m = mq(); const onChange = () => setSystem(systemTheme());
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);
  const theme = saved || system;
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    const keep = next === system ? null : next;
    setSaved(keep);
    try { keep ? localStorage.setItem(KEY, keep) : localStorage.removeItem(KEY); } catch (e) {}
  }
  return { theme, toggle };
}
