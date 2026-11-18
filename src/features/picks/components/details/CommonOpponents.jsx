import { useEffect, useState } from 'react';
import { commonOpponents } from '@/services/espn/index.js';
import { CompareRows } from './CompareRows.jsx';

// Opponents both teams have played this season, each side's result against them:
// "W 31–17" (their score first). Played twice → both results.
const Result = ({ games }) => (
  <span className="co-results">
    {games.map((g, i) => <span key={i} className={'co-res ' + (g.won ? 'w' : 'l')}>{g.won ? 'W' : 'L'} {g.us}–{g.them}</span>)}
  </span>
);

export function CommonOpponents({ game }) {
  const [rows, setRows] = useState(null);
  const [a, h] = game.competitors;
  useEffect(() => {
    let alive = true;
    commonOpponents(a.id, h.id).then(r => alive && setRows(r)).catch(() => alive && setRows([]));
    return () => { alive = false; };
  }, [a.id, h.id]);
  if (!rows?.length) return null;
  return <CompareRows title="Common opponents" rows={rows.map(r => ({ label: r.opp.name, away: <Result games={r.away} />, home: <Result games={r.home} /> }))} />;
}
