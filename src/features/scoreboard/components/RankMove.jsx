// ▲2 / ▼1 / – / NEW next to a player, vs. their rank last week.
export function RankMove({ prior, rank }) {
  if (prior === undefined) return <span className="move new">NEW</span>;
  const delta = prior - rank;
  if (delta > 0) return <span className="move up">&#9650;{delta}</span>;
  if (delta < 0) return <span className="move down">&#9660;{Math.abs(delta)}</span>;
  return <span className="move same">&ndash;</span>;
}
