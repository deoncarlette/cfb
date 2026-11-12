import { useEffect, useState } from 'react';

export function useTheme() {
  const [mode, setMode] = useState(() => { try { return localStorage.getItem('theme-pref') || 'system'; } catch (e) { return 'system'; } });
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    function apply() {
      const effective = mode === 'system' ? (mq.matches ? 'light' : 'dark') : mode;
      document.documentElement.setAttribute('data-theme', effective);
    }
    apply();
    if (mode === 'system') { mq.addEventListener('change', apply); return () => mq.removeEventListener('change', apply); }
  }, [mode]);
  function cycle() {
    const next = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    setMode(next);
    try { localStorage.setItem('theme-pref', next); } catch (e) {}
  }
  const label = mode === 'system' ? '\u{1F5A5}\uFE0F System' : mode === 'light' ? '\u2600\uFE0F Light' : '\u{1F319} Dark';
  return { mode, cycle, label };
}
