import { useEffect, useState } from 'react';
import { computeOverallStandings } from '@/features/scoreboard/scoring.js';
import { sampleFileWeeks } from '../sample/samplePicks.js';

// A player's season before this week: points (the recorded weekly scores, same as the
// Scoreboard) and win–loss record (their picks in the picks file against each game's winner).
// Add this week's live totals on top to get the season so far. → { right, wrong, points } | null
export function useSeasonStats(week, name) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let alive = true;
    setStats(null);
    if (typeof week !== 'number' || !name) return;
    const key = name.toLowerCase();
    Promise.all([week > 0 ? computeOverallStandings(week - 1) : Promise.resolve([]), sampleFileWeeks()])
      .then(([rows, fileWeeks]) => {
        const points = Number(rows.find(r => r.user_name.toLowerCase() === key)?.score) || 0;
        let right = 0, wrong = 0;
        fileWeeks.filter(w => typeof w.week === 'number' && w.week < week).forEach(w => {
          const winners = new Map(w.games.map(g => [g.gameId, g.winner]));
          const b = w.ballots.find(x => x.playerName.toLowerCase() === key && x.entered);
          (b?.picks || []).forEach(p => {
            const win = winners.get(p.gameId);
            if (!win) return;
            if (p.pick === win) right++; else wrong++;
          });
        });
        if (alive) setStats({ right, wrong, points });
      })
      .catch(() => alive && setStats(null));
    return () => { alive = false; };
  }, [week, name]);
  return stats;
}
