import { useEffect, useState } from 'react';
import { getAllPicksForWeek } from '@/services/data/index.js';
import { SEASON_ROSTER } from '@/features/scoreboard/scoring.js';

// Everyone's saved picks for a week, for the "Picks shown" selector on locked weeks.
// Only loads once the week is locked, so nobody's picks are fetched early.
// Returns { players: [name], entryFor(name) → saved entry or null }.
export function useOtherPlayers(week, locked, sample) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!locked) { setEntries([]); return; }
    let alive = true;
    getAllPicksForWeek(week).then(list => { if (alive) setEntries(list); }).catch(() => {});
    return () => { alive = false; };
  }, [week, locked]);

  const norm = s => (s || '').trim().toLowerCase();
  // The sample file's picks count as that player's saved picks (unless still hidden/randomized).
  const sampleOwner = sample && !sample.randomized ? sample.playerName : null;
  const names = new Map();
  [...SEASON_ROSTER, ...entries.map(e => e.user_name), sampleOwner].filter(Boolean)
    .forEach(n => { if (!names.has(norm(n))) names.set(norm(n), n.trim()); });
  const players = [...names.values()].sort((a, b) => a.localeCompare(b));

  function entryFor(name) {
    const saved = entries.find(e => norm(e.user_name) === norm(name));
    if (saved) return saved;
    return sampleOwner && norm(sampleOwner) === norm(name) ? sample : null;
  }

  return { players, entryFor };
}
