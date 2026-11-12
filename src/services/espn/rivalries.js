// Rivalry games for the Commish tab. Three ways a game counts:
//   1. It's on this list (names match ESPN's team "location" names).
//   2. ESPN gives it a name with Rivalry/Trophy/Cup/Bowl/Classic/Showdown in it (regular season).
//   3. In-state: both teams' names contain the same state (Georgia vs Georgia State,
//      Michigan vs Western Michigan, Kentucky vs Western Kentucky).
// Add to the list freely — order doesn't matter.
export const RIVALRIES = [
  ['Red River Rivalry', 'Texas', 'Oklahoma'],
  ['Iron Bowl', 'Alabama', 'Auburn'],
  ['The Game', 'Ohio State', 'Michigan'],
  ['Army–Navy Game', 'Army', 'Navy'],
  ["Governor's Cup", 'Kentucky', 'Louisville'],
  ['Clean, Old-Fashioned Hate', 'Georgia', 'Georgia Tech'],
  ['Egg Bowl', 'Ole Miss', 'Mississippi State'],
  ['Apple Cup', 'Washington', 'Washington State'],
  ['Oregon–Oregon State', 'Oregon', 'Oregon State'],
  ['Bedlam', 'Oklahoma', 'Oklahoma State'],
  ['Sunshine Showdown', 'Florida', 'Florida State'],
  ['Palmetto Bowl', 'Clemson', 'South Carolina'],
  ['Lone Star Showdown', 'Texas', 'Texas A&M'],
  ['Holy War', 'BYU', 'Utah'],
  ['Backyard Brawl', 'Pittsburgh', 'West Virginia'],
  ['Paul Bunyan Trophy', 'Michigan', 'Michigan State'],
  ['Old Oaken Bucket', 'Indiana', 'Purdue'],
  ['Land of Lincoln Trophy', 'Illinois', 'Northwestern'],
  ["Paul Bunyan's Axe", 'Wisconsin', 'Minnesota'],
  ['Floyd of Rosedale', 'Iowa', 'Minnesota'],
  ['Cy-Hawk Trophy', 'Iowa', 'Iowa State'],
  ['Heroes Game', 'Iowa', 'Nebraska'],
  ['Sunflower Showdown', 'Kansas', 'Kansas State'],
  ['Commonwealth Clash', 'Virginia', 'Virginia Tech'],
  ["South's Oldest Rivalry", 'Virginia', 'North Carolina'],
  ['Victory Bell', 'Duke', 'North Carolina'],
  ['NC State–UNC', 'NC State', 'North Carolina'],
  ['Crosstown Showdown', 'UCLA', 'USC'],
  ['Jeweled Shillelagh', 'Notre Dame', 'USC'],
  ['Notre Dame–Navy', 'Notre Dame', 'Navy'],
  ["Deep South's Oldest Rivalry", 'Auburn', 'Georgia'],
  ['Florida–Georgia', 'Florida', 'Georgia'],
  ['Third Saturday in October', 'Alabama', 'Tennessee'],
  ['Battle for the Golden Boot', 'LSU', 'Arkansas'],
  ['Magnolia Bowl', 'LSU', 'Ole Miss'],
  ['Florida–Tennessee', 'Florida', 'Tennessee'],
  ['Miami–Florida State', 'Miami', 'Florida State'],
  ['Miami–Florida', 'Miami', 'Florida'],
  ['Big Game', 'California', 'Stanford'],
  ['Territorial Cup', 'Arizona', 'Arizona State'],
  ['Rocky Mountain Showdown', 'Colorado', 'Colorado State'],
  ['Beehive Boot', 'Utah', 'Utah State'],
  ["Commander-in-Chief's Trophy", 'Army', 'Air Force'],
  ["Commander-in-Chief's Trophy", 'Navy', 'Air Force'],
  ['Iron Skillet', 'SMU', 'TCU'],
  ['Revivalry', 'Baylor', 'TCU'],
  ['Keystone Classic', 'Penn State', 'Pittsburgh'],
  ['Battle for the Victory Bell', 'Cincinnati', 'Miami (OH)'],
  ['Bayou Classic', 'Grambling', 'Southern'],
  ['Florida Classic', 'Bethune-Cookman', 'Florida A&M'],
  ['Battle of the Real HU', 'Howard', 'Hampton'],
  ['Howard–Morgan State', 'Howard', 'Morgan State']
];

const STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming']
  .sort((a, b) => b.length - a.length); // longest first, so "West Virginia" wins over "Virginia"

const norm = s => (s || '').toLowerCase().replace(/[–—-]/g, ' ').replace(/[^a-z0-9()& ]+/g, '').trim();

function stateIn(name) {
  const n = ` ${norm(name)} `;
  return STATES.find(s => n.includes(` ${s.toLowerCase()} `)) || null;
}

function namesOf(team) {
  return [team.name, ...(team.altNames || [])].map(norm);
}

// → rivalry name, "In-state", or null. useTitle: count ESPN's game name (off for bowls, whose
// names are bowl names, not rivalries).
export function rivalryFor(game, useTitle = true) {
  const [a, b] = game.competitors;
  const has = (team, n) => namesOf(team).includes(norm(n));
  const listed = RIVALRIES.find(([, x, y]) => (has(a, x) && has(b, y)) || (has(a, y) && has(b, x)));
  if (listed) return listed[0];
  const title = game.title || '';
  if (useTitle && /rivalry|trophy|cup|bowl|classic|showdown/i.test(title)) return title;
  const sa = stateIn(a.name), sb = stateIn(b.name);
  if (sa && sa === sb) return 'In-state';
  return null;
}
