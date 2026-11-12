import { displayRank, gameStatusLabel } from '@/services/espn/index.js';

const rankPrefix = t => displayRank(t) ? `#${displayRank(t)} ` : '';

// One group of games (Top 25 / Power 4 / All Other) with checkboxes and select-all.
export function GameSection({ label, games, includedIds, onToggle, onSelectAll, onDeselectAll }) {
  if (!games.length) return null;
  const ids = games.map(g => g.id);
  return (
    <div>
      <div className="section-heading">
        <span><span className="section-label">{label}</span><span className="section-count">({games.length})</span></span>
        <span className="section-actions row-gap" style={{ margin: 0 }}>
          <button onClick={() => onSelectAll(ids)}>Select all</button>
          <button onClick={() => onDeselectAll(ids)}>Deselect all</button>
        </span>
      </div>
      {games.map(g => {
        const [away, home] = g.competitors;
        return (
          <div key={g.id} className="commish-row">
            <label>
              <input type="checkbox" checked={includedIds.has(g.id)} onChange={() => onToggle(g.id)} />
              {rankPrefix(away)}{away.name} @ {rankPrefix(home)}{home.name}
            </label>
            <span className="muted small">{gameStatusLabel(g)}</span>
          </div>
        );
      })}
    </div>
  );
}
