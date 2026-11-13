import { useEffect, useState } from 'react';

// The theme currently on <html data-theme>, kept in sync when the toggle changes it.
const read = () => document.documentElement.getAttribute('data-theme') || 'dark';
export function useDocTheme() {
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const o = new MutationObserver(() => setTheme(read()));
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => o.disconnect();
  }, []);
  return theme;
}
