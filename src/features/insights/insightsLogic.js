// Commissioner insights for a week's LOCKED games: where the pool agrees, where it splits, which
// consensus picks went wrong, and players worth a look (going against their usual pack
// behavior, leaning on underdogs, lone high-confidence picks, all chalk).
// people: [{ name, picks: { gameId: { winner, confidence } } }]
// history: Map lowercased name → { agree: 0–1, weeks } (typical agreement with the majority in
// earlier weeks), or null.
import { favoriteId } from '@/features/picks/picksLogic.js';
import { gameWinnerId } from '@/services/espn/index.js';

const MIN_VOTERS = 4;

export function weekInsights(games, people, history = null) {
  const perGame = games.map(game => {
    const [away, home] = game.competitors;
    const side = team => {
      const rows = people.filter(p => p.picks[game.id]?.winner === team.id)
        .map(p => ({ name: p.name, confidence: Number(p.picks[game.id].confidence) || 0 }));
      return { team, n: rows.length, points: rows.reduce((t, r) => t + r.confidence, 0), rows };
    };
    const sides = [side(away), side(home)];
    const n = sides[0].n + sides[1].n;
    const major = sides[0].n === sides[1].n ? null : sides[0].n > sides[1].n ? sides[0] : sides[1];
    const minor = major && (major === sides[0] ? sides[1] : sides[0]);
    const winner = gameWinnerId(game);
    return { game, sides, n, major, minor, share: major ? major.n / n : 0.5, winner, favorite: favoriteId(game) };
  }).filter(g => g.n > 0);

  const voted = perGame.filter(g => g.n >= MIN_VOTERS);
  const consensus = voted.filter(g => g.share >= 0.75).sort((a, b) => b.share - a.share || b.major.points - a.major.points).slice(0, 4);
  const splits = [...voted].sort((a, b) => Math.abs(a.share - 0.5) - Math.abs(b.share - 0.5) || (b.sides[0].points + b.sides[1].points) - (a.sides[0].points + a.sides[1].points)).slice(0, 4);
  const burned = voted.filter(g => g.winner && g.major && g.major.team.id !== g.winner)
    .sort((a, b) => b.major.points - a.major.points).slice(0, 4);

  // Players
  const players = people.map(p => {
    let counted = 0, agree = 0, dogs = 0, dogPts = 0, pts = 0, picks = 0;
    const lone = [];
    perGame.forEach(g => {
      const pick = p.picks[g.game.id];
      if (!pick) return;
      const conf = Number(pick.confidence) || 0;
      picks++; pts += conf;
      if (pick.winner !== g.favorite) { dogs++; dogPts += conf; }
      if (g.major) { counted++; if (pick.winner === g.major.team.id) agree++; }
      const mine = g.sides.find(s => s.team.id === pick.winner);
      if (g.n >= MIN_VOTERS && mine.n === 1) lone.push({ game: g.game, team: mine.team, confidence: conf, won: g.winner ? g.winner === pick.winner : null });
    });
    const typical = history?.get(p.name.toLowerCase()) || null;
    return {
      name: p.name, picks,
      agree: counted ? agree / counted : null,
      typical: typical && typical.weeks >= 2 ? typical.agree : null,
      dogShare: picks ? dogs / picks : 0, dogPtsShare: pts ? dogPts / pts : 0, dogs,
      lone: lone.sort((a, b) => b.confidence - a.confidence)
    };
  }).filter(p => p.picks > 0);

  const flags = [];
  players.forEach(p => {
    if (p.agree != null && p.typical != null && p.picks >= 5 && p.typical - p.agree >= 0.2) {
      flags.push({ name: p.name, kind: 'contrarian', title: 'Going against the pack',
        text: `With the majority on ${pct(p.agree)} of picks this week, vs ${pct(p.typical)} usually.` });
    }
    if (p.picks >= 5 && (p.dogShare >= 0.6 || p.dogPtsShare >= 0.6)) {
      flags.push({ name: p.name, kind: 'dogs', title: 'Riding the underdogs',
        text: `${p.dogs} of ${p.picks} picks on underdogs, carrying ${pct(p.dogPtsShare)} of their points.` });
    } else if (p.picks >= 8 && p.dogs === 0) {
      flags.push({ name: p.name, kind: 'chalk', title: 'All chalk', text: `Every pick on the favorite.` });
    }
    const bold = p.lone.filter(l => l.confidence >= 15);
    if (bold.length) {
      const top = bold[0];
      const result = top.won == null ? '' : top.won ? ' It hit.' : ' It missed.';
      flags.push({ name: p.name, kind: 'lone', title: 'Lone wolf',
        text: `Only one on ${top.team.abbr || top.team.name} (${top.game.competitors.map(c => c.abbr || c.name).join(' vs ')}), with ${top.confidence} points.${result}`
          + (bold.length > 1 ? ` ${bold.length - 1} more solo pick${bold.length > 2 ? 's' : ''} at 15+.` : '') });
    }
  });

  return {
    games: perGame.length, players: players.length,
    unanimous: voted.filter(g => g.share === 1).length,
    consensus, splits, burned, flags
  };
}

const pct = x => `${Math.round(x * 100)}%`;

// Typical agreement with the majority per player from the picks file's earlier weeks (real picks
// only — simulated ones would just add noise). → Map lowercased name → { agree, weeks }
export function agreementHistory(fileWeeks, beforeWeek) {
  const totals = new Map();
  fileWeeks.filter(w => typeof w.week === 'number' && w.week < beforeWeek).forEach(w => {
    const ballots = w.ballots.filter(b => b.entered);
    w.games.forEach(g => {
      const votes = ballots.map(b => ({ b, p: b.picks.find(p => p.gameId === g.gameId) })).filter(x => x.p && !x.p.isMock);
      if (votes.length < MIN_VOTERS) return;
      const count = new Map();
      votes.forEach(({ p }) => count.set(p.pick, (count.get(p.pick) || 0) + 1));
      const [[top, n], second] = [...count.entries()].sort((a, b) => b[1] - a[1]);
      if (second && second[1] === n) return; // tie: no majority
      votes.forEach(({ b, p }) => {
        const key = b.playerName.toLowerCase();
        const t = totals.get(key) || { agree: 0, n: 0, weeks: new Set() };
        t.n++; if (p.pick === top) t.agree++; t.weeks.add(w.week);
        totals.set(key, t);
      });
    });
  });
  return new Map([...totals].filter(([, t]) => t.n >= 10).map(([k, t]) => [k, { agree: t.agree / t.n, weeks: t.weeks.size }]));
}
