import { useEffect, useState } from 'react';
import { pollRanksFor } from '@/services/espn/index.js';
import { CompareRows } from './CompareRows.jsx';

// Every poll side by side for the two teams: CFP (this week's, or the latest earlier one until
// it's out — labeled with its week), AP and Coaches (AFCA). "—" = unranked in that poll.
export function PollRanks({ game, week }) {
  const [polls, setPolls] = useState(null);
  useEffect(() => {
    let alive = true;
    pollRanksFor(typeof week === 'number' ? week : null).then(p => alive && setPolls(p)).catch(() => {});
    return () => { alive = false; };
  }, [week]);
  if (!polls) return null;
  const [a, h] = game.competitors;
  const row = (label, map) => map && { label, away: map.get(String(a.id)) ?? '—', home: map.get(String(h.id)) ?? '—' };
  const cfpLabel = polls.cfpWeek != null && typeof week === 'number' && polls.cfpWeek < week ? `CFP (Wk ${polls.cfpWeek})` : 'CFP';
  const rows = [row(cfpLabel, polls.cfp), row('AP', polls.ap), row('Coaches', polls.coaches)].filter(Boolean);
  if (!rows.some(r => r.away !== '—' || r.home !== '—')) return null;
  return <CompareRows title="Rankings" rows={rows} />;
}
