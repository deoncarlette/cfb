import { useEffect, useState } from 'react';
import { getAllPicksForWeek } from '@/services/data/index.js';
import { SEASON_ROSTER } from '@/features/scoreboard/scoring.js';

// Everyone's picks for a week, for the "View picks for" selector on locked weeks: real pool-sheet
// ballots first, then picks saved in the app, then the sample file's mock ballots. Only loads once the week is locked, so
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
    // A real ballot from the pool sheet is the source of truth; picks saved in the app fill in
    // for anyone the sheet doesn't have (and for mock/sample ballots).
    const fromFile = sampleBallots.get(norm(name));
    if (fromFile && !fromFile.isMock) return fromFile;
    return entries.find(e => norm(e.user_name) === norm(name)) || fromFile || null;
  }

  return { players, entryFor };
}
