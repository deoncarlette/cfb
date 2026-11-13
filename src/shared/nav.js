import { useMemo, useSyncExternalStore } from 'react';

// Where you are in the app lives in the address: #picks?week=10&player=Joseph
// Each change is a browser history entry, so Back/Forward step through tabs, weeks and whose
// picks you're viewing; a reload keeps your place; and a link can open someone's picks.
//   tab: 'picks' | 'scoreboard' | 'commish' | null   week: number | 'bowls' | null   player: string

function parse(hash) {
  const [tab, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const p = new URLSearchParams(query);
  const w = p.get('week');
  return { tab: tab || null, week: w == null || w === '' ? null : isNaN(Number(w)) ? w : Number(w), player: p.get('player') || '' };
}
function build({ tab, week, player }) {
  const p = new URLSearchParams();
  if (week != null) p.set('week', String(week));
  if (player) p.set('player', player);
  const q = p.toString();
  return '#' + (tab || '') + (q ? '?' + q : '');
}

const listeners = new Set();
const emit = () => listeners.forEach(l => l());
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', emit);
  window.addEventListener('hashchange', emit);
}
const subscribe = l => { listeners.add(l); return () => listeners.delete(l); };
const snapshot = () => window.location.hash;

export function currentNav() { return parse(window.location.hash); }

// navigate({ tab, week, player }) — only the keys you pass change. replace: no new history entry.
export function navigate(patch, { replace = false } = {}) {
  const url = build({ ...currentNav(), ...patch });
  if (url === window.location.hash) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
  emit();
}

export function useNav() {
  const hash = useSyncExternalStore(subscribe, snapshot, () => '');
  return useMemo(() => parse(hash), [hash]);
}
