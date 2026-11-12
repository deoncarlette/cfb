import { gameCategory } from '@/services/espn/index.js';

// Plain functions for the Picks tab — no React, easy to test.

// Until the commissioner configures a week, default to Top 25 + Power 4 rather than the full
// slate (can be 70+ games some weeks).
export function gamesForWeek(allGames, config) {
  return config.includedGameIds
    ? allGames.filter(g => config.includedGameIds.includes(g.id))
    : allGames.filter(g => gameCategory(g) !== 'other');
}

// Picks lock at the commissioner's deadline, or else the earliest kickoff.
export function isDeadlinePassed(config, games) {
  if (config.deadlineIso) return Date.now() >= new Date(config.deadlineIso).getTime();
  const first = games.reduce((earliest, g) => !earliest || new Date(g.date) < new Date(earliest) ? g.date : earliest, null);
  return first ? Date.now() >= new Date(first).getTime() : false;
}

// Pick a team, or clear the pick if that team was already picked.
export function togglePick(winners, gameId, teamId) {
  if (winners[gameId] !== teamId) return { ...winners, [gameId]: teamId };
  const next = { ...winners }; delete next[gameId]; return next;
}

// mode: 'home' | 'away' | 'random' → { gameId: teamId }
export function quickPickWinners(games, mode) {
  const next = {};
  games.forEach(g => {
    const [away, home] = g.competitors;
    if (mode === 'home') next[g.id] = home.id;
    else if (mode === 'away') next[g.id] = away.id;
    else if (mode === 'random') next[g.id] = Math.random() < 0.5 ? away.id : home.id;
  });
  return next;
}

// Card order → what gets saved. Top card = most confident = highest points.
export function buildPicksMap(order, winners) {
  const picksMap = {};
  order.forEach((gameId, idx) => { picksMap[gameId] = { winner: winners[gameId], confidence: order.length - idx }; });
  return picksMap;
}

// Saved picks → { winners, order } to put back on screen. Games with no saved pick go first.
export function restoreSavedPicks(saved, games) {
  const winners = {}; const ranked = [];
  Object.entries(saved.picks || {}).sort((a, b) => b[1].confidence - a[1].confidence).forEach(([gid, p]) => {
    winners[gid] = p.winner; ranked.push(gid);
  });
  const missing = games.map(g => g.id).filter(id => !ranked.includes(id));
  return { winners, order: [...missing, ...ranked].filter(id => games.some(g => g.id === id)) };
}
