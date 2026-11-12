// All the ESPN-related logic that was proven working in the Canva-built prototype,
// ported here as a plain module so both the Entry and Commissioner screens share one
// implementation instead of two slightly-different copies.

export const SEASON = 2026;

// Best-effort Power 4 membership for sorting/categorizing games — ESPN's scoreboard
// endpoint doesn't return conference names directly, so this is a maintained list rather
// than live data. Matched case-insensitively against ESPN's team "location" name (the
// unabbreviated school name, e.g. "Washington State" not "Washington St"). Realignment
// happens — double check this periodically.
export const P4_TEAMS = new Set([
  // SEC
  "Alabama","Arkansas","Auburn","Florida","Georgia","Kentucky","LSU","Mississippi State",
  "Missouri","Ole Miss","South Carolina","Tennessee","Texas A&M","Vanderbilt","Oklahoma","Texas",
  // Big Ten
  "Illinois","Indiana","Iowa","Maryland","Michigan","Michigan State","Minnesota","Nebraska",
  "Northwestern","Ohio State","Penn State","Purdue","Rutgers","Wisconsin","UCLA","USC","Oregon","Washington",
  // Big 12
  "Baylor","BYU","Cincinnati","Houston","Iowa State","Kansas","Kansas State","Oklahoma State",
  "TCU","Texas Tech","UCF","West Virginia","Arizona","Arizona State","Colorado","Utah",
  // ACC
  "Boston College","California","Clemson","Duke","Florida State","Georgia Tech","Louisville",
  "Miami","NC State","North Carolina","Pittsburgh","SMU","Stanford","Syracuse","Virginia",
  "Virginia Tech","Wake Forest"
]);

export function isP4(name) { return P4_TEAMS.has((name || "").trim()); }

// ESPN uses 99 as the "unranked" placeholder in curatedRank — it isn't a real vote count.
// Treat anything under that as a real, sortable rank even outside the AP top 25, but only
// ever DISPLAY the number when it's an actual top-25 rank.
export function hasRealRank(c) { return !!c.rank && c.rank < 99; }
export function displayRank(c) { return c && c.rank && c.rank <= 25 ? c.rank : null; }
export function bestRealRank(game) {
  const ranks = game.competitors.filter(hasRealRank).map(c => c.rank);
  return ranks.length ? Math.min(...ranks) : 999;
}

export function gameCategory(game) {
  if (game.competitors.some(hasRealRank)) return "top25";
  if (game.competitors.some(c => isP4(c.name))) return "power4";
  return "other";
}

export function hexColor(value, fallback) {
  return value && /^[0-9a-f]{6}$/i.test(value) ? `#${value}` : fallback;
}

export function textForBackground(hex) {
  const clean = (hex || '').replace('#', '');
  if (clean.length !== 6) return '#ffffff';
  const brightness = (parseInt(clean.slice(0, 2), 16) * 299 + parseInt(clean.slice(2, 4), 16) * 587 + parseInt(clean.slice(4, 6), 16) * 114) / 1000;
  return brightness > 150 ? '#242421' : '#ffffff';
}

// Intl.DateTimeFormat automatically uses the viewer's own browser/OS timezone when no
// explicit timeZone is passed, so this shows EDT/CDT/PST/etc. correctly per person with no
// manual detection needed.
export function formatKickoff(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "numeric", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short"
  }).formatToParts(d);
  const get = type => parts.find(p => p.type === type)?.value || "";
  const weekday = get("weekday").toUpperCase().replace(".", "");
  return `${weekday}, ${get("month")}/${get("day")} ${get("hour")}:${get("minute")} ${get("dayPeriod")} ${get("timeZoneName")}`;
}

// ESPN's own status.shortDetail is pre-formatted in Eastern time on their end — fine for a
// live game's clock (no other source for that), wrong for an upcoming kickoff, which should
// use formatKickoff so it reflects the viewer's own timezone.
export function gameStatusLabel(game) {
  if (game.completed) return "FINAL";
  if (game.state === "in") return game.status;
  return formatKickoff(game.date);
}

export async function fetchEspnGames(week, groups = [80]) {
  const results = await Promise.all(groups.map(async groupId => {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?limit=500&dates=${SEASON}&seasontype=2&week=${week}&groups=${groupId}`);
    if (!response.ok) throw new Error("Schedule unavailable");
    const data = await response.json();
    return data.events || [];
  }));
  const seen = new Set();
  const events = results.flat().filter(event => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
  return events.map(event => {
    const competition = event.competitions?.[0];
    const competitors = (competition?.competitors || []).map(entry => ({
      id: String(entry.team.id),
      name: entry.team.location || entry.team.displayName || entry.team.shortDisplayName || "Team",
      homeAway: entry.homeAway || "away",
      record: entry.records?.find(r => r.type === "total")?.summary || "",
      color: hexColor(entry.team.color, "#5b5a55"),
      logo: entry.team.logo || "",
      rank: entry.curatedRank?.current || null
    })).sort((a, b) => a.homeAway === "away" ? -1 : b.homeAway === "away" ? 1 : 0);

    return {
      id: String(event.id),
      date: event.date,
      venue: competition?.venue?.fullName || formatKickoff(event.date),
      status: event.status?.type?.shortDetail || "Scheduled",
      state: event.status?.type?.state || "pre",
      completed: event.status?.type?.completed === true,
      competitors
    };
  }).filter(game => game.competitors.length === 2);
}

// Once the CFP committee starts publishing its own rankings (typically week 11+), that
// becomes the more meaningful number than the AP poll baked into curatedRank, so this tries
// to overlay it from ESPN's separate rankings endpoint. NOTE: this endpoint is less
// documented than the scoreboard one — verify the poll is actually found once real games are
// live around week 10-11. If it can't be found, this fails silently and every game just
// keeps the AP-style rank it already had.
export const CFP_SWITCH_WEEK = 10;

async function fetchPollRankMap(week, keyword) {
  try {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings?week=${week}&seasontype=2`);
    if (!response.ok) return null;
    const data = await response.json();
    const poll = (data.rankings || []).find(p => `${p.shortName || ""} ${p.name || ""} ${p.type || ""}`.toLowerCase().includes(keyword));
    if (!poll || !poll.ranks) return null;
    const map = new Map();
    poll.ranks.forEach(entry => { if (entry.team?.id) map.set(String(entry.team.id), entry.current); });
    return map.size ? map : null;
  } catch (e) {
    return null;
  }
}

export async function applyRankOverlay(gamesList, week) {
  if (week <= CFP_SWITCH_WEEK) return gamesList;
  const cfpMap = (await fetchPollRankMap(week, "cfp")) || (await fetchPollRankMap(week, "playoff"));
  if (!cfpMap) return gamesList;
  gamesList.forEach(game => game.competitors.forEach(c => { if (cfpMap.has(c.id)) c.rank = cfpMap.get(c.id); }));
  return gamesList;
}

// ---- CFP bracket helpers ----

function teamFromRankEntry(entry) {
  const t = entry.team || {};
  const logo = t.logo || t.logos?.[0]?.href || '';
  return {
    id: String(t.id),
    name: t.location || t.nickname || t.displayName || t.name || 'Team',
    abbr: t.abbreviation || '',
    logo,
    color: hexColor(t.color, '#5b5a55'),
    record: entry.recordSummary || '',
    rank: entry.current ?? null
  };
}

// Latest published rankings (no week param = ESPN's current set). Prefers the CFP committee
// poll and falls back to AP before the committee starts publishing. Returns
// { pollName, teams: [...] } sorted by rank, or null if ESPN doesn't answer.
export async function fetchCurrentRankings() {
  try {
    const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings');
    if (!response.ok) return null;
    const data = await response.json();
    const polls = data.rankings || [];
    const label = p => `${p.shortName || ''} ${p.name || ''} ${p.type || ''}`.toLowerCase();
    const poll = polls.find(p => label(p).includes('cfp') || label(p).includes('playoff'))
      || polls.find(p => label(p).includes('ap'))
      || polls[0];
    if (!poll?.ranks?.length) return null;
    const teams = poll.ranks.map(teamFromRankEntry).filter(t => t.id && t.id !== 'undefined')
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
    return { pollName: poll.shortName || poll.name || 'Rankings', isCfp: /cfp|playoff/.test(label(poll)), teams };
  } catch (e) {
    return null;
  }
}

// Best-effort: scans ESPN's postseason scoreboard and returns { gameKey: winnerTeamId } for
// every bracket game whose two real teams have a completed matchup. `matchups` is
// [{ key, teams: [idA, idB] }] for games whose participants are already known. Also returns
// the title game's combined score (for the tiebreaker) when it's final.
export async function fetchPlayoffResults(matchups) {
  const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?limit=300&seasontype=3&dates=${SEASON}1201-${SEASON + 1}0131&groups=80`);
  if (!response.ok) throw new Error('Postseason scoreboard unavailable');
  const data = await response.json();
  const finals = (data.events || []).map(event => {
    const comp = event.competitions?.[0];
    const sides = (comp?.competitors || []).map(c => ({ id: String(c.team?.id), score: Number(c.score) || 0, winner: c.winner === true }));
    return { completed: event.status?.type?.completed === true, sides };
  }).filter(e => e.completed && e.sides.length === 2);

  const results = {};
  let championshipTotal = null;
  matchups.forEach(({ key, teams }) => {
    const match = finals.find(f => teams.every(id => f.sides.some(s => s.id === id)));
    if (!match) return;
    const winner = match.sides.find(s => s.winner) || [...match.sides].sort((a, b) => b.score - a.score)[0];
    results[key] = winner.id;
    if (key === 'nc') championshipTotal = match.sides[0].score + match.sides[1].score;
  });
  return { results, championshipTotal };
}
