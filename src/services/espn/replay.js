// Test helper: makes finished games look like they're being played today (see REPLAY_WEEK in
// config.js). Pure function of the real games + the current time, so calling it again a
// minute later moves every game forward a minute.

const GAME_LENGTH_MS = 3.5 * 60 * 60 * 1000;

// Repeatable 0–1 "random" from a string, so a game replays the same way every refresh.
function rand(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

// Break a final score into touchdowns/field goals, each at a moment between 0 and 1.
function scoringPlays(final, seed) {
  const plays = []; let left = final; let i = 0;
  while (left > 0) {
    let pts = left >= 7 ? (rand(`${seed}:${i}`) < 0.72 ? 7 : 3) : left >= 3 ? 3 : left;
    plays.push(pts); left -= pts; i += 1;
  }
  return plays.map((pts, k) => ({ pts, at: Math.min(0.98, (k + 0.3 + rand(`${seed}:t${k}`) * 0.6) / plays.length) }));
}

function clockAt(f) {
  const quarter = Math.min(4, Math.floor(f * 4) + 1);
  const left = Math.max(0, Math.round((1 - (f * 4 - (quarter - 1))) * 15 * 60));
  return `Q${quarter} ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}

export function replayGames(games, now = new Date()) {
  return games.map(g => {
    if (!g.completed) return g;
    const real = new Date(g.date);
    const kickoff = new Date(now); kickoff.setHours(real.getHours(), real.getMinutes(), 0, 0);
    const f = (now - kickoff) / GAME_LENGTH_MS;
    const base = { ...g, date: kickoff.toISOString() };
    if (f < 0) {
      return { ...base, completed: false, state: 'pre', status: 'Scheduled', competitors: g.competitors.map(c => ({ ...c, score: null, winner: false })) };
    }
    if (f >= 1) return base; // final, with the real score
    return {
      ...base, completed: false, state: 'in', status: clockAt(f),
      competitors: g.competitors.map(c => ({
        ...c, winner: false,
        score: scoringPlays(c.score ?? 0, `${g.id}:${c.id}`).filter(p => p.at <= f).reduce((s, p) => s + p.pts, 0)
      }))
    };
  });
}
