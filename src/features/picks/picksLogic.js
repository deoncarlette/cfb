import { isDefaultSlateGame, gameWinnerId, POSTSEASON } from '@/services/espn/index.js';

// Plain functions for the Picks tab — no React, easy to test.

// Until the commissioner configures a week, default to Top 25 + Howard + SEC + Big Ten
// (see isDefaultSlateGame) rather than the full slate, which can be 70+ games.
// Bowl games: every bowl (the CFP games are already left out).
export function gamesForWeek(allGames, config, week) {
  if (!config.includedGameIds && week === POSTSEASON) return allGames;
  return config.includedGameIds
    ? allGames.filter(g => config.includedGameIds.includes(g.id))
    : allGames.filter(isDefaultSlateGame);
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

// Result of one pick once its game is final: { earned, of, correct } — earned is the
// confidence points if right, 0 if wrong. null if the game isn't final or wasn't picked.
export function pickResult(game, pickedTeamId, confidence) {
  const winner = gameWinnerId(game);
  if (!winner || !pickedTeamId) return null;
  const correct = pickedTeamId === winner;
  return { earned: correct ? confidence : 0, of: confidence, correct };
}

// Week totals for the summary bar. pointsFor(gameId) → that game's confidence.
export function weekTotals(games, winners, pointsFor) {
  let earned = 0, right = 0, wrong = 0, stillPossible = 0, total = 0;
  games.forEach(g => {
    const pick = winners[g.id];
    if (!pick) return;
    const pts = pointsFor(g.id);
    total += pts;
    const r = pickResult(g, pick, pts);
    if (!r) { stillPossible += pts; return; }
    if (r.correct) { earned += pts; right += 1; } else wrong += 1;
  });
  return { earned, right, wrong, decided: right + wrong, maxPossible: earned + stillPossible, total };
}

// While a game is live: is your pick ahead? 'leading' | 'trailing' | 'tied' | null
export function liveStanding(game, pickedTeamId) {
  if (game.state !== 'in' || !pickedTeamId) return null;
  const mine = game.competitors.find(c => c.id === pickedTeamId);
  const other = game.competitors.find(c => c.id !== pickedTeamId);
  if (!mine || !other || mine.score == null || other.score == null) return null;
  return mine.score > other.score ? 'leading' : mine.score < other.score ? 'trailing' : 'tied';
}
