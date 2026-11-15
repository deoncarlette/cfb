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
    // Every drive's team and game-clock window, and every snap's down & distance — used by the
    // test replay to show who has the ball and the situation at the replayed moment.
    ...(() => {
      // ESPN also lists the drive in progress at the end of `previous`; keep one copy (the current).
      const cur = data.drives?.current;
      const sameDrive = (d, c) => (d.id && c.id ? String(d.id) === String(c.id)
        : String(d.team?.id) === String(c.team?.id) && !(d.displayResult || d.result));
      const all = [...(data.drives?.previous || []).filter(d => !cur || !sameDrive(d, cur)), ...(cur ? [cur] : [])];
      const drives = all.map(d => ({
        teamId: String(d.team?.id ?? ''),
        start: { period: d.start?.period?.number, clock: d.start?.clock?.displayValue },
        end: { period: d.end?.period?.number, clock: d.end?.clock?.displayValue }
      })).filter(d => d.teamId && d.start.period);
      const plays = all.flatMap(d => (d.plays || []).map(p => ({
        teamId: String(p.start?.team?.id ?? d.team?.id ?? ''),
        period: p.period?.number,
        clock: p.clock?.displayValue,
        downDistance: p.start?.downDistanceText || null,
        yardsToEndzone: p.start?.yardsToEndzone ?? null
      }))).filter(p => p.teamId && p.period && p.downDistance);
      // The drive log for the Drives list: who had it, when it started, how it ended (ESPN's
      // result: Touchdown, Field Goal, Punt, Interception, Fumble, Downs, …), its summary
      // ("8 plays, 75 yards, 3:21") and the score after it.
      // The score after a drive comes from ESPN's official scoring plays (they account for missed
      // PATs and 2-point tries; a drive's own play scores don't always): the last scoring play
      // between the drive's start and end. Only if there are no scoring plays, the drive's plays.
      const secs = c => { const m = /^(\d+):(\d{2})$/.exec(c || ''); return m ? +m[1] * 60 + +m[2] : null; };
      const at = (period, clock) => (period && secs(clock) != null ? (period - 1) * 900 + (900 - secs(clock)) : null);
      // The try after a touchdown, from the end of the scoring play's text, e.g. "(Peyton
      // Woodring Kick)", "(PAT failed)", "(Two-Point Pass Conversion Failed)".
      const conversion = text => {
        const m = /\(([^()]*)\)\s*$/.exec(text || '');
        if (!m || !/touchdown|\btd\b|yd (run|pass|.*return)|yard/i.test(text)) return null;
        const t = m[1];
        const failed = /fail|missed|no good|block|incomplete|aborted/i.test(t);
        if (/two[- ]point|2[- ]?pt/i.test(t)) return failed ? '2-pt failed' : '2-pt good';
        if (/kick|pat|extra point/i.test(t)) return failed ? 'PAT missed' : 'PAT good';
        return null;
      };
      const scored = (data.scoringPlays || []).map(p => ({ t: at(p.period?.number, p.clock?.displayValue), away: p.awayScore, home: p.homeScore, conversion: conversion(p.text), teamId: String(p.team?.id ?? ''), text: p.text || '', type: p.type?.text || '' })).filter(p => p.t != null);
      const lastScore = d => {
        const from = at(d.start?.period?.number ?? d.plays?.[0]?.period?.number, d.start?.clock?.displayValue || d.plays?.[0]?.clock?.displayValue);
        const to = at(d.end?.period?.number, d.end?.clock?.displayValue);
        if (scored.length) {
          if (from == null || to == null) return null;
          // After the drive starts (a score at its very first second belongs to the drive before).
          const hits = scored.filter(p => p.t > from && p.t <= to);
          const h = hits[hits.length - 1];
          return h ? { away: h.away, home: h.home, conversion: h.conversion, teamId: h.teamId, how: `${h.type} ${h.text}` } : null;
        }
        const ps = (d.plays || []).filter(p => p.awayScore != null && p.homeScore != null); const p = ps[ps.length - 1];
        return p ? { away: p.awayScore, home: p.homeScore } : null;
      };
      // A drive just underway may not have its start filled in yet — use its first play's.
      const firstPlay = d => (d.plays || [])[0];
      // When the other team scores on a drive (punt return, pick-six, fumble return, blocked
      // kick, safety), ESPN still marks the drive a score; say what happened and who scored.
      const againstLabel = how => (/safety/i.test(how) ? 'Safety' : /punt/i.test(how) ? 'Punt return TD'
        : /interception|int return/i.test(how) ? 'Pick-six' : /fumble/i.test(how) ? 'Fumble return TD'
        : /block/i.test(how) ? 'Blocked kick TD' : /kickoff/i.test(how) ? 'Kickoff return TD' : 'Opponent score');
      const driveLog = all.map((d, i) => {
        const score = lastScore(d);
        let team = String(d.team?.id ?? '');
        let against = !!(score?.teamId && team && score.teamId !== team);
        // An ordinary offensive score credited to the other team means ESPN has the drive's
        // team wrong: trust the scoring play.
        if (against && againstLabel(score.how) === 'Opponent score') { team = score.teamId; against = false; }
        return {
        againstBy: against ? score.teamId : null,
        againstLabel: against ? againstLabel(score.how) : null,
        teamId: team,
        period: d.start?.period?.number ?? firstPlay(d)?.period?.number,
        clock: d.start?.clock?.displayValue || firstPlay(d)?.clock?.displayValue || '',
        endPeriod: d.end?.period?.number, endClock: d.end?.clock?.displayValue || '',
        result: d.displayResult || d.result || '',
        isScore: !!d.isScore,
        description: /^0 plays\b/.test(d.description || '') ? '' : d.description || '',
        current: !!cur && i === all.length - 1 && !(data.header?.competitions?.[0]?.status?.type?.completed),
        score
      }; }).filter(d => d.teamId && d.period);
      return { drives, plays, driveLog };
    })(),
    // Home win % after each play, in order (used by the test replay to rewind win probability).
    winTimeline: (data.winprobability || []).map(w => w.homeWinPercentage).filter(v => v != null),
    broadcast: b?.media?.shortName || b?.names?.[0] || null,
    weather: w ? (w.displayValue ? `${w.temperature ?? ''}° ${w.displayValue}`.trim() : w.temperature != null ? `${w.temperature}°` : null) : null,
    attendance: data.gameInfo?.attendance || null
  };
}
