import { ESPN_BASE } from './client.js';
import { hexColor } from '@/shared/utils/colors.js';

// ESPN's game summary (box score + pregame matchup info) for one game, flattened into an
// away/home shape the details panel can draw. Every section is optional — ESPN leaves things
// out depending on the game and whether it has started — so anything missing is null / [].

const STAT_ROWS = [
  ['totalYards', 'Total yards'], ['netPassingYards', 'Passing'], ['rushingYards', 'Rushing'],
  ['firstDowns', '1st downs'], ['thirdDownEff', '3rd down'], ['turnovers', 'Turnovers'],
  ['totalPenaltiesYards', 'Penalties'], ['possessionTime', 'Possession']
];
const LEADER_CATEGORIES = ['passingYards', 'rushingYards', 'receivingYards'];

const recordOf = (records, ...types) => (records || []).find(r => types.includes(r.type) || types.includes(r.name))?.summary || null;

export async function fetchGameSummary(eventId) {
  const response = await fetch(`${ESPN_BASE}/summary?event=${eventId}`);
  if (!response.ok) throw new Error('Game summary unavailable');
  return parseSummary(await response.json());
}

export function parseSummary(data) {
  const comp = data.header?.competitions?.[0] || {};
  const side = homeAway => {
    const c = (comp.competitors || []).find(x => x.homeAway === homeAway);
    if (!c) return null;
    const records = c.record || c.records;
    return {
      id: String(c.team?.id ?? c.id),
      abbr: c.team?.abbreviation || '',
      name: c.team?.location || c.team?.displayName || '',
      color: hexColor(c.team?.color, '#5b5a55'),
      altColor: hexColor(c.team?.alternateColor, null),
      score: c.score ?? null,
      linescores: (c.linescores || []).map(l => l.displayValue ?? l.value),
      record: recordOf(records, 'total', 'overall'),
      venueRecord: recordOf(records, homeAway === 'home' ? 'home' : 'road', homeAway === 'home' ? 'Home' : 'Road')
    };
  };
  const away = side('away'); const home = side('home');
  if (!away || !home) return null;
  const pair = (getter) => ({ away: getter(away.id), home: getter(home.id) });

  // Win probability: live from the in-game feed, else ESPN's pregame matchup predictor.
  let winProb = null;
  const live = data.winprobability?.length ? data.winprobability[data.winprobability.length - 1] : null;
  if (live?.homeWinPercentage != null) {
    const h = Math.round(live.homeWinPercentage * 1000) / 10;
    winProb = { away: Math.round((100 - h) * 10) / 10, home: h, live: true };
  } else if (data.predictor?.homeTeam?.gameProjection != null) {
    winProb = { away: Number(data.predictor.awayTeam?.gameProjection), home: Number(data.predictor.homeTeam.gameProjection), live: false };
  }

  const pc = data.pickcenter?.[0];
  const odds = pc ? {
    provider: pc.provider?.name || null,
    details: pc.details || null,
    overUnder: pc.overUnder ?? null,
    moneyline: { away: pc.awayTeamOdds?.moneyLine ?? null, home: pc.homeTeamOdds?.moneyLine ?? null }
  } : null;

  const atsFor = id => (data.againstTheSpread || []).find(t => String(t.team?.id) === id)?.records?.[0]?.summary || null;
  const ats = data.againstTheSpread?.length ? pair(atsFor) : null;

  const lastFiveFor = id => ((data.lastFiveGames || []).find(t => String(t.team?.id) === id)?.events || []).map(e => ({
    result: e.gameResult || '', opponent: e.opponent?.abbreviation || '', atVs: e.atVs || 'vs', score: e.score || ''
  }));
  const lastFive = data.lastFiveGames?.length ? pair(lastFiveFor) : null;

  const statsFor = id => (data.boxscore?.teams || []).find(t => String(t.team?.id) === id)?.statistics || [];
  const stats = STAT_ROWS.map(([name, label]) => {
    const v = id => statsFor(id).find(s => s.name === name)?.displayValue ?? null;
    return { label, away: v(away.id), home: v(home.id) };
  }).filter(r => r.away != null || r.home != null);

  const leadersFor = id => (data.leaders || []).find(t => String(t.team?.id) === id)?.leaders || [];
  const leaders = LEADER_CATEGORIES.map(cat => {
    const one = id => {
      const l = leadersFor(id).find(x => x.name === cat);
      const top = l?.leaders?.[0];
      return top ? { player: top.athlete?.shortName || top.athlete?.displayName || '', value: top.displayValue || '', label: l.displayName } : null;
    };
    const a = one(away.id), h = one(home.id);
    return a || h ? { label: (a || h).label || cat, away: a, home: h } : null;
  }).filter(Boolean);

  const scoring = (data.scoringPlays || []).map(p => ({
    period: p.period?.number, clock: p.clock?.displayValue || '', teamId: String(p.team?.id ?? ''),
    text: p.text || p.type?.text || '', away: p.awayScore, home: p.homeScore
  }));

  const b = comp.broadcasts?.[0] || data.broadcasts?.[0];
  const w = data.gameInfo?.weather;
  return {
    away, home, winProb, odds, ats, lastFive, stats, leaders, scoring,
    // Home win % after each play, in order (used by the test replay to rewind win probability).
    winTimeline: (data.winprobability || []).map(w => w.homeWinPercentage).filter(v => v != null),
    broadcast: b?.media?.shortName || b?.names?.[0] || null,
    weather: w ? (w.displayValue ? `${w.temperature ?? ''}° ${w.displayValue}`.trim() : w.temperature != null ? `${w.temperature}°` : null) : null,
    attendance: data.gameInfo?.attendance || null
  };
}
