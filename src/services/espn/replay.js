import { fetchGameSummary } from './summary.js';

// Test helper (see REPLAY_WEEK in config.js): makes finished games look like they're being
// played today. Each game "kicks off" today at its real time of day — twice, AM and PM — and runs ~3½ hours of real
// time for 60 minutes of game clock. Everything is a pure function of the clock, so a refresh a
// minute later moves every game forward a minute.
//
// With the game's real ESPN box score loaded, the score, quarter scores, scoring plays and win
// probability are exact for the replayed game clock. Team stats and leaders exist only as final
// totals, so they're scaled to the share of the game played.

const GAME_LENGTH_MS = 3.5 * 60 * 60 * 1000;
const QUARTER_SECS = 15 * 60;

// ---- the replay clock ----

// Every game shows its real state for today: upcoming before its real kickoff time, live
// during it (~3½ hours), final after — so points add up through the day like a real Saturday.
// The "day" turns over at 4 AM so late games can finish.
// Schedule 'twice' (default) also runs each game as a live PREVIEW 12 hours away from its real
// kickoff (an 8 PM game is live 8–11:30 AM; an 11 AM game is live 11 PM–2:30 AM), so there's
// something live to test at any hour. A preview never counts: when it ends, the game goes
// straight back to its real state. 'real' = no previews.
// Saved in this browser; the replay notes on Picks and Scoreboard switch it.
const SCHEDULE_KEY = 'replay-schedule';
export function replaySchedule() {
  try { return localStorage.getItem(SCHEDULE_KEY) === 'real' ? 'real' : 'twice'; } catch (e) { return 'twice'; }
}
export function setReplaySchedule(value) {
  try { localStorage.setItem(SCHEDULE_KEY, value === 'real' ? 'real' : 'twice'); } catch (e) {}
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_STARTS_AT = 4; // 4 AM

// { kickoff, f, preview } — f is the share of the game played: <0 not started, 0–1 live, ≥1 final.
// preview: this is the 12-hours-away live preview, not the game's real run.
export function replayClock(realDate, now = new Date(), schedule = replaySchedule()) {
  const real = new Date(realDate);
  const kickoff = new Date(now.getTime() - DAY_STARTS_AT * HOUR_MS); // today's date (4 AM turnover)
  kickoff.setHours(real.getHours(), real.getMinutes(), 0, 0);
  if (real.getHours() < DAY_STARTS_AT) kickoff.setDate(kickoff.getDate() + 1); // after-midnight kickoffs
  if (schedule !== 'real') {
    for (const shift of [-12, 12]) {
      const preview = new Date(kickoff.getTime() + shift * HOUR_MS);
      const f = (now - preview) / GAME_LENGTH_MS;
      if (f >= 0 && f < 1) return { kickoff: preview, f, preview: true };
    }
  }
  return { kickoff, f: (now - kickoff) / GAME_LENGTH_MS, preview: false };
}

function clockAt(f) {
  const elapsed = Math.max(0, Math.min(1, f)) * 4 * QUARTER_SECS;
  const quarter = Math.min(4, Math.floor(elapsed / QUARTER_SECS) + 1);
  const left = Math.max(0, Math.round(QUARTER_SECS - (elapsed - (quarter - 1) * QUARTER_SECS)));
  return `Q${quarter} ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}

// Game seconds elapsed when a play happened ("Q2 8:12" left → 6:48 into Q2 → 1308s).
function playElapsed(p) {
  const [m, s] = String(p.clock || '0:00').split(':').map(Number);
  return ((p.period || 1) - 1) * QUARTER_SECS + (QUARTER_SECS - ((m || 0) * 60 + (s || 0)));
}

// The situation at a moment: the last snap at or before it, from ESPN's play-by-play —
// who has the ball, down & distance ("2nd & 7 at OSU 14"), and red zone. Falls back to the
// drive chart (possession only), then to alternating every ~4 minutes of game clock.
function situationAt(summary, game, elapsed) {
  const snaps = (summary?.plays || []).filter(p => playElapsed(p) <= elapsed);
  const snap = snaps[snaps.length - 1];
  if (snap) {
    return { possession: snap.teamId, downDistance: snap.downDistance, redZone: snap.yardsToEndzone != null && snap.yardsToEndzone <= 20 };
  }
  return { possession: possessionAt(summary, game, elapsed), downDistance: null, redZone: false };
}

function possessionAt(summary, game, elapsed) {
  const drive = (summary?.drives || []).find(d =>
    playElapsed(d.start) <= elapsed && elapsed <= playElapsed(d.end || d.start));
  if (drive) return drive.teamId;
  const [a, b] = game.competitors;
  return Math.floor(elapsed / 240) % 2 ? b.id : a.id;
}

// ---- box scores for the replayed week (finals never change, so fetch each once) ----

const summaries = new Map();
export async function loadReplaySummaries(games) {
  await Promise.all(games.filter(g => g.completed && !summaries.has(g.id)).map(g =>
    fetchGameSummary(g.id).then(s => summaries.set(g.id, s)).catch(() => {})));
}
export const replaySummaryFor = id => summaries.get(id) || null;

// ---- rewinding a box score to share f of the game ----

const scaleNumber = (n, f) => Math.round(n * f);
// Scale every number in a stat string: "356" → "178", "4-12" → "2-6", "28:18" → "14:09".
function scaleStat(text, f) {
  if (text == null) return text;
  const t = String(text);
  if (/^\d+:\d{2}$/.test(t)) {
    const [m, s] = t.split(':').map(Number);
    const secs = Math.round((m * 60 + s) * f);
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  }
  return t.replace(/\d[\d,]*/g, n => scaleNumber(Number(n.replace(/,/g, '')), f).toLocaleString());
}

export function rewindSummary(s, f) {
  if (!s) return s;
  if (f >= 1) return s;
  const pre = f < 0;
  const elapsed = Math.max(0, f) * 4 * QUARTER_SECS;
  const scoring = pre ? [] : s.scoring.filter(p => playElapsed(p) <= elapsed);
  const last = scoring[scoring.length - 1];
  const awayScore = last ? Number(last.away) || 0 : 0;
  const homeScore = last ? Number(last.home) || 0 : 0;

  // Quarter scores rebuilt from the plays so far (each play's score minus the one before it).
  const currentQ = Math.min(4, Math.floor(elapsed / QUARTER_SECS) + 1);
  const byQ = { away: [0, 0, 0, 0], home: [0, 0, 0, 0] };
  let pa = 0, ph = 0;
  scoring.forEach(p => {
    const q = Math.min(4, p.period || 1) - 1;
    byQ.away[q] += (Number(p.away) || 0) - pa; byQ.home[q] += (Number(p.home) || 0) - ph;
    pa = Number(p.away) || 0; ph = Number(p.home) || 0;
  });
  const lines = side => (pre ? [] : byQ[side].slice(0, currentQ).map(String));

  const t = s.winTimeline || [];
  const winProb = !pre && t.length
    ? (() => { const h = Math.round(t[Math.min(t.length - 1, Math.floor(f * t.length))] * 1000) / 10; return { away: Math.round((100 - h) * 10) / 10, home: h, live: true }; })()
    : pre ? s.winProb : null;

  return {
    ...s,
    away: { ...s.away, score: pre ? null : awayScore, linescores: lines('away') },
    home: { ...s.home, score: pre ? null : homeScore, linescores: lines('home') },
    scoring,
    winProb,
    stats: pre ? [] : s.stats.map(r => ({ ...r, away: scaleStat(r.away, f), home: scaleStat(r.home, f) })),
    leaders: pre ? [] : s.leaders.map(l => ({
      ...l,
      away: l.away && { ...l.away, value: scaleStat(l.away.value, f) },
      home: l.home && { ...l.home, value: scaleStat(l.home.value, f) }
    })),
    attendance: null,
    replay: { f, estimatedStats: !pre }
  };
}

// ---- fallback when a box score isn't available: made-up scoring that adds up to the final ----

function rand(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}
function syntheticScore(final, seed, f) {
  const plays = []; let left = final; let i = 0;
  while (left > 0) { const pts = left >= 7 ? (rand(`${seed}:${i}`) < 0.72 ? 7 : 3) : left >= 3 ? 3 : left; plays.push(pts); left -= pts; i += 1; }
  return plays.reduce((sum, pts, k) => sum + ((k + 0.3 + rand(`${seed}:t${k}`) * 0.6) / plays.length <= f ? pts : 0), 0);
}

// ---- the games list ----

export function replayGames(games, now = new Date()) {
  return games.map(g => {
    if (!g.completed) return g;
    const { kickoff, f } = replayClock(g.date, now);
    const base = { ...g, date: kickoff.toISOString(), replay: { f } };
    if (f < 0) {
      return { ...base, completed: false, state: 'pre', status: 'Scheduled', competitors: g.competitors.map(c => ({ ...c, score: null, winner: false })) };
    }
    if (f >= 1) return base; // final, real score
    const real = replaySummaryFor(g.id);
    const rewound = real && rewindSummary(real, f);
    return {
      ...base, completed: false, state: 'in', status: clockAt(f),
      situation: situationAt(real, g, f * 4 * QUARTER_SECS),
      competitors: g.competitors.map(c => ({
        ...c, winner: false,
        score: rewound
          ? (c.id === rewound.home.id ? rewound.home.score : rewound.away.score)
          : syntheticScore(c.score ?? 0, `${g.id}:${c.id}`, f)
      }))
    };
  });
}
