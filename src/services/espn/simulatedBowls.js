// Stand-in bowl slate for testing, used only while ESPN hasn't posted the season's bowls (it
// usually does in early December, after the conference title games). Real bowl names, sites
// and networks with estimated dates; matchups from this season's actual teams:
//   - the projected 12-team CFP field is left out (those teams are in the bracket)
//   - the rest are ranked best first (poll rank, then win %), and the bigger bowls get the
//     better teams, avoiding same-conference matchups
//   - the Celebration Bowl is the best MEAC team vs the best SWAC team
// Every game is marked simulated: true. Nothing is random, so the slate is the same on every
// load and for every player.
import { SEASON } from '@/config.js';
import { projectField } from '@/features/bracket/bracketLogic.js';
import { isFbsTeam } from './teams.js';

const Y = SEASON, Y1 = SEASON + 1;
// [name, date-time (Central), venue, network] — biggest bowls first (they get the best teams).
const BOWLS = [
  ['Citrus Bowl', `${Y1}-01-01T12:00:00-06:00`, 'Camping World Stadium', 'ABC'],
  ['ReliaQuest Bowl', `${Y}-12-31T11:00:00-06:00`, 'Raymond James Stadium', 'ESPN'],
  ['Alamo Bowl', `${Y}-12-29T20:00:00-06:00`, 'Alamodome', 'ESPN'],
  ['Gator Bowl', `${Y}-12-27T18:30:00-06:00`, 'EverBank Stadium', 'ESPN'],
  ['Pop-Tarts Bowl', `${Y}-12-27T14:30:00-06:00`, 'Camping World Stadium', 'ABC'],
  ['Holiday Bowl', `${Y}-12-30T19:00:00-06:00`, 'Snapdragon Stadium', 'FOX'],
  ['Sun Bowl', `${Y}-12-31T13:00:00-06:00`, 'Sun Bowl Stadium', 'CBS'],
  ['Las Vegas Bowl', `${Y}-12-26T18:30:00-06:00`, 'Allegiant Stadium', 'ESPN'],
  ['Music City Bowl', `${Y}-12-30T13:30:00-06:00`, 'Nissan Stadium', 'ESPN'],
  ['Texas Bowl', `${Y}-12-28T20:00:00-06:00`, 'NRG Stadium', 'ESPN'],
  ['Liberty Bowl', `${Y}-12-29T16:30:00-06:00`, 'Simmons Bank Liberty Stadium', 'ESPN'],
  ["Duke's Mayo Bowl", `${Y}-12-27T10:00:00-06:00`, 'Bank of America Stadium', 'ESPN'],
  ['Pinstripe Bowl', `${Y}-12-26T11:00:00-06:00`, 'Yankee Stadium', 'ABC'],
  ['Military Bowl', `${Y}-12-28T10:00:00-06:00`, 'Navy-Marine Corps Memorial Stadium', 'ESPN'],
  ['Fenway Bowl', `${Y}-12-26T10:00:00-06:00`, 'Fenway Park', 'ESPN'],
  ['Armed Forces Bowl', `${Y}-12-29T13:00:00-06:00`, 'Amon G. Carter Stadium', 'ESPN'],
  ['Independence Bowl', `${Y}-12-30T16:00:00-06:00`, 'Independence Stadium', 'ESPN'],
  ['First Responder Bowl', `${Y}-12-26T15:00:00-06:00`, 'Gerald J. Ford Stadium', 'ESPN'],
  ['Birmingham Bowl', `${Y}-12-29T11:00:00-06:00`, 'Protective Stadium', 'ESPN'],
  ['Gasparilla Bowl', `${Y}-12-23T17:30:00-06:00`, 'Raymond James Stadium', 'ESPN'],
  ['Arizona Bowl', `${Y}-12-27T15:30:00-06:00`, 'Arizona Stadium', 'The CW'],
  ['LA Bowl', `${Y}-12-19T19:30:00-06:00`, 'SoFi Stadium', 'ABC'],
  ['New Mexico Bowl', `${Y}-12-19T13:15:00-06:00`, 'University Stadium', 'ESPN'],
  ['Famous Idaho Potato Bowl', `${Y}-12-22T13:00:00-06:00`, 'Albertsons Stadium', 'ESPN'],
  ['Hawaii Bowl', `${Y}-12-24T19:00:00-06:00`, 'Clarence T.C. Ching Complex', 'ESPN'],
  ['New Orleans Bowl', `${Y}-12-20T20:00:00-06:00`, 'Caesars Superdome', 'ESPN'],
  ['Boca Raton Bowl', `${Y}-12-18T18:00:00-06:00`, 'Flagler Credit Union Stadium', 'ESPN'],
  ['Cure Bowl', `${Y}-12-19T10:00:00-06:00`, 'Camping World Stadium', 'ESPN'],
  ['Myrtle Beach Bowl', `${Y}-12-21T13:30:00-06:00`, 'Brooks Stadium', 'ESPN'],
  ['Camellia Bowl', `${Y}-12-20T16:30:00-06:00`, 'Cramton Bowl', 'ESPN'],
  ['Bahamas Bowl', `${Y}-12-22T10:00:00-06:00`, 'Thomas A. Robinson Stadium', 'ESPN'],
  ['Salute to Veterans Bowl', `${Y}-12-19T16:00:00-06:00`, 'Cramton Bowl', 'ESPN']
];
const CELEBRATION = ['Celebration Bowl', `${Y}-12-12T11:00:00-06:00`, 'Mercedes-Benz Stadium', 'ABC'];

const winPct = t => {
  const [w, l] = (t.record || '').split('-').map(Number);
  return w + l > 0 ? w / (w + l) : 0;
};
const better = (a, b) => (a.rank || 99) - (b.rank || 99) || winPct(b) - winPct(a) || a.name.localeCompare(b.name);
// Small stable numbers from a string, for the stand-in lines.
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function game(i, [title, date, venue, broadcast], a, b) {
  const [fav, dog] = better(a, b) <= 0 ? [a, b] : [b, a];
  const h = hash(title + fav.id + dog.id);
  const spread = 1.5 + (h % 9) + Math.min(6, Math.max(0, (dog.rank || 30) - (fav.rank || 30)) / 3);
  return {
    id: `sim-bowl-${i + 1}`, date, title, venue, broadcast, simulated: true,
    status: 'Scheduled', state: 'pre', completed: false, situation: null,
    line: { spread: `${fav.abbr} -${Math.round(spread * 2) / 2}`, overUnder: 44.5 + (h % 17), favorite: fav.id },
    competitors: [
      { ...dog, homeAway: 'away', score: null, winner: false },
      { ...fav, homeAway: 'home', score: null, winner: false }
    ]
  };
}

// fbsGames / fcsGames: this season's latest regular-season games (for teams and records).
export function simulatedBowls(fbsGames, fcsGames = []) {
  const teams = new Map();
  fbsGames.forEach(g => g.competitors.forEach(c => { if (!teams.has(c.id) && isFbsTeam(c)) teams.set(c.id, c); }));
  const ranked = [...teams.values()].filter(t => t.rank && t.rank <= 25).sort((a, b) => a.rank - b.rank);
  const inPlayoff = new Set(projectField(ranked).map(t => t.id));
  const pool = [...teams.values()].filter(t => !inPlayoff.has(t.id)).sort(better);

  const out = [];
  BOWLS.forEach((bowl, i) => {
    let [a, b] = [pool[2 * i], pool[2 * i + 1]];
    if (!a || !b) return;
    // Avoid same-conference bowls: trade with the next team down.
    if (a.conferenceId && a.conferenceId === b.conferenceId && pool[2 * i + 2]) {
      [pool[2 * i + 1], pool[2 * i + 2]] = [pool[2 * i + 2], pool[2 * i + 1]];
      b = pool[2 * i + 1];
    }
    out.push(game(i, bowl, a, b));
  });

  const fcs = new Map();
  fcsGames.forEach(g => g.competitors.forEach(c => { if (!fcs.has(c.id)) fcs.set(c.id, c); }));
  const best = conf => [...fcs.values()].filter(t => t.conferenceId === conf).sort(better)[0];
  const meac = best('24'), swac = best('31');
  if (meac && swac) out.push(game(BOWLS.length, CELEBRATION, swac, meac));

  return out.sort((x, y) => new Date(x.date) - new Date(y.date));
}
