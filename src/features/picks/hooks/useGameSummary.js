import { useEffect, useState } from 'react';
import { fetchGameSummary } from '@/services/espn/index.js';

const cache = new Map(); // eventId → summary, so reopening a finished game is instant

// Loads a game's box score / matchup info when its details are opened. Live games re-load
// every 30 seconds while open.
export function useGameSummary(eventId, live) {
  const [summary, setSummary] = useState(() => cache.get(eventId) || null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    // Stand-in bowls (simulated until ESPN posts the real ones) have nothing to look up.
    if (String(eventId).startsWith('sim-')) { setError('Simulated matchup: details come once ESPN posts the real bowl.'); return () => {}; }
    const load = () => fetchGameSummary(eventId)
      .then(s => {
        if (!alive) return;
        if (!s) { if (!cache.get(eventId)) setError('ESPN has no details for this game yet.'); return; }
        cache.set(eventId, s); setSummary(s); setError('');
      })
      .catch(() => { if (alive && !cache.get(eventId)) setError("Couldn't load game details from ESPN."); });
    load();
    const id = live ? setInterval(load, 30 * 1000) : null;
    return () => { alive = false; if (id) clearInterval(id); };
  }, [eventId, live]);

  return { summary, error };
}
