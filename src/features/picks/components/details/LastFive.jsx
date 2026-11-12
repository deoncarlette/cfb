// Each team's last five results as W/L chips (hover/long-press for opponent and score).
export function LastFive({ games }) {
  return (
    <span className="last5">
      {games.map((g, i) => (
        <span key={i} className={'l5 ' + (g.result === 'W' ? 'w' : g.result === 'L' ? 'l' : '')} title={`${g.result} ${g.atVs} ${g.opponent} ${g.score}`}>{g.result || '·'}</span>
      ))}
    </span>
  );
}
