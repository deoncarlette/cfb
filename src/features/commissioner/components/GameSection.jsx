import { displayRank, gameStatusLabel } from '@/services/espn/index.js';

const rankPrefix = t => displayRank(t) ? `#${displayRank(t)} ` : '';

// One group of games (Rivalries / Top 25 / Power 4 / All Other) with checkboxes and select-all.
// subgroupOf(game) → name splits it into smaller lists (e.g. by conference), in `order`;
// noteFor(game) → short text shown with the game (e.g. the rivalry's name).
export function GameSection({ label, games, includedIds, onToggle, onSelectAll, onDeselectAll, subgroupOf, order = [], noteFor }) {
  if (!games.length) return null;
  const ids = games.map(g => g.id);

  let groups = [{ name: null, games }];
  if (subgroupOf) {
    const map = new Map();
    games.forEach(g => { const k = subgroupOf(g); map.set(k, [...(map.get(k) || []), g]); });
    const rank = k => (order.indexOf(k) === -1 ? order.length : order.indexOf(k));
    groups = [...map.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0])).map(([name, gs]) => ({ name, games: gs }));
  }

  return (
    <div className="slate-section">
      <div className="section-heading">
        <span><span className="section-label">{label}</span><span className="section-count">({games.length})</span></span>
        <span className="section-actions">
          <button onClick={() => onSelectAll(ids)}>Select all</button>
          <button onClick={() => onDeselectAll(ids)}>Deselect all</button>
        </span>
      </div>
      {groups.map(group => (
        <div key={group.name || 'all'} className="slate-subgroup">
          {group.name && (
            <div className="subgroup-heading">
              <span>{group.name} <span className="section-count">({group.games.length})</span></span>
              <span className="section-actions">
                <button onClick={() => onSelectAll(group.games.map(g => g.id))}>All</button>
                <button onClick={() => onDeselectAll(group.games.map(g => g.id))}>None</button>
              </span>
            </div>
          )}
          {group.games.map(g => {
            const [away, home] = g.competitors;
            const note = noteFor?.(g);
            return (
              <div key={g.id} className="commish-row">
                <label>
                  <input type="checkbox" checked={includedIds.has(g.id)} onChange={() => onToggle(g.id)} />
                  <span>
                    {rankPrefix(away)}{away.name} @ {rankPrefix(home)}{home.name}
                    {note && <small className="rivalry-name">{note}</small>}
                  </span>
                </label>
                <span className="muted small">{gameStatusLabel(g)}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
