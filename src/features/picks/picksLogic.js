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

const byKickoff = (a, b) => new Date(a.date) - new Date(b.date);

// Which games are locked right now, per the commissioner's lock setting:
//   'slate'   — every game locks at once: the commissioner's deadline, or else the first kickoff.
//   'kickoff' — each game locks at its own kickoff.
// → { mode, lockedIds, anyLocked, allLocked, lockAt (when the slate locks / the next kickoff),
//     nextCount (kickoff mode: how many games kick off at lockAt) }
export function lockInfo(config, games, now = Date.now()) {
  const sorted = [...games].sort(byKickoff);
  if (config.lockMode === 'kickoff') {
    const started = g => g.completed || g.state === 'in' || now >= new Date(g.date).getTime();
    const lockedIds = new Set(sorted.filter(started).map(g => g.id));
    const nextGame = sorted.find(g => !lockedIds.has(g.id)) || null;
    const lockAt = nextGame?.date ?? null;
    const nextCount = lockAt ? sorted.filter(g => !lockedIds.has(g.id) && new Date(g.date).getTime() === new Date(lockAt).getTime()).length : 0;
    return { mode: 'kickoff', lockedIds, anyLocked: lockedIds.size > 0, allLocked: games.length > 0 && !nextGame, lockAt, nextCount };
  }
  const lockAt = config.deadlineIso || sorted[0]?.date || null;
  const all = !!lockAt && now >= new Date(lockAt).getTime();
  return { mode: 'slate', lockedIds: new Set(all ? games.map(g => g.id) : []), anyLocked: all, allLocked: all, lockAt, nextCount: 0 };
}

// A copy of the list in random order.
export function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Pick a team, or clear the pick if that team was already picked.
export function togglePick(winners, gameId, teamId) {
  if (winners[gameId] !== teamId) return { ...winners, [gameId]: teamId };
  const next = { ...winners }; delete next[gameId]; return next;
}

// The betting favorite's team id: from the line, else the better-ranked team, else the home team.
export function favoriteId(game) {
  const [away, home] = game.competitors;
  if (game.line?.favorite) return game.line.favorite;
  const r = t => Number(t.rank) || 99;
  if (r(away) !== r(home)) return r(away) < r(home) ? away.id : home.id;
  return home.id;
}

// The higher-ranked team's id, by the first source that tells them apart: CFP rankings → AP
// points (receiving-votes points count) → Coaches points → the betting favorite → a coin flip.
// polls: { cfp, ap, coaches } from fetchPollScores (Maps teamId → score; higher = better).
export function higherRankedId(game, polls) {
  const [away, home] = game.competitors;
  for (const map of [polls?.cfp, polls?.ap, polls?.coaches]) {
    if (!map) continue;
    const a = map.get(away.id) || 0, h = map.get(home.id) || 0;
    if (a !== h) return a > h ? away.id : home.id;
  }
  if (game.line?.favorite) return game.line.favorite;
  return Math.random() < 0.5 ? away.id : home.id;
}

// mode: 'home' | 'away' | 'random' | 'favorites' | 'underdogs' | 'ranked' → { gameId: teamId }
// ('ranked' needs polls.)
export function quickPickWinners(games, mode, polls = null) {
  const next = {};
  games.forEach(g => {
    const [away, home] = g.competitors;
    const fav = favoriteId(g);
    if (mode === 'home') next[g.id] = home.id;
    else if (mode === 'away') next[g.id] = away.id;
    else if (mode === 'random') next[g.id] = Math.random() < 0.5 ? away.id : home.id;
    else if (mode === 'favorites') next[g.id] = fav;
    else if (mode === 'underdogs') next[g.id] = fav === home.id ? away.id : home.id;
    else if (mode === 'ranked') next[g.id] = higherRankedId(g, polls);
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
