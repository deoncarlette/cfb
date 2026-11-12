import { useEffect, useState } from 'react';
import { getAllPicksForWeek } from '@/services/data/index.js';
import { SEASON_ROSTER } from '@/features/scoreboard/scoring.js';

// Everyone's picks for a week, for the "Picks shown" selector on locked weeks: picks saved in
// the app first, then the sample file's ballots. Only loads once the week is locked, so
// nobody's picks are fetched early. Returns { players: [name], entryFor(name) → entry or null }.
export function useOtherPlayers(week, locked, sample) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!locked) { setEntries([]); return; }
    let alive = true;
    getAllPicksForWeek(week).then(list => { if (alive) setEntries(list); }).catch(() => {});
    return () => { alive = false; };
  }, [week, locked]);

  const norm = s => (s || '').trim().toLowerCase();
  const sampleBallots = sample?.ballots || new Map();
  const names = new Map();
  [...SEASON_ROSTER, ...entries.map(e => e.user_name), ...[...sampleBallots.values()].map(b => b.user_name)]
    .filter(Boolean).forEach(n => { if (!names.has(norm(n))) names.set(norm(n), n.trim()); });
  const players = [...names.values()].sort((a, b) => a.localeCompare(b));

  function entryFor(name) {
    return entries.find(e => norm(e.user_name) === norm(name)) || sampleBallots.get(norm(name)) || null;
  }

  return { players, entryFor };
}
