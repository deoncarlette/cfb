import { useState } from 'react';
import { displayRank, gameStatusLabel } from '@/services/espn/index.js';

const rankPrefix = t => displayRank(t) ? `#${displayRank(t)} ` : '';

// One group of games (Rivalries / Top 25 / Power 4 / All Other) with checkboxes and select-all.
// subgroupOf(game) → name splits it into smaller lists (e.g. by conference), in `order`;
// noteFor(game) → short text shown with the game (e.g. the rivalry's name).
// The section and each subgroup collapse. Each starts collapsed if none of its games are checked;
// once you open/close one or change its checkboxes, it stays where you left it.
export function GameSection({ label, games, includedIds, onToggle, onSelectAll, onDeselectAll, subgroupOf, order = [], noteFor, disabled = false }) {
  const [pinned, setPinned] = useState({}); // { groupKey: open } — set once you touch a group
  if (!games.length) return null;
  const ids = games.map(g => g.id);
  const checked = list => list.filter(g => includedIds.has(g.id)).length;
  const isOpen = (key, list) => pinned[key] ?? checked(list) > 0;
  const pin = changes => setPinned(p => ({ ...p, ...changes }));

  let groups = [{ name: null, games }];
  if (subgroupOf) {
    const map = new Map();
    games.forEach(g => { const k = subgroupOf(g); map.set(k, [...(map.get(k) || []), g]); });
    const rank = k => (order.indexOf(k) === -1 ? order.length : order.indexOf(k));
    groups = [...map.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0])).map(([name, gs]) => ({ name, games: gs }));
  }

  // Freeze every group's current open/closed state, so select/deselect doesn't fold anything up.
  const pinAll = () => pin(Object.fromEntries([['__section', isOpen('__section', games)], ...groups.filter(g => g.name).map(g => [g.name, isOpen(g.name, g.games)])]));
  const sectionOpen = isOpen('__section', games);

  return (
    <div className={'slate-section' + (sectionOpen ? ' open' : '')}>
      <div className="section-heading">
        <button type="button" className="collapse-toggle" aria-expanded={sectionOpen} onClick={() => { pinAll(); pin({ __section: !sectionOpen }); }}>
          <span className="chevron" aria-hidden="true" />
          <span className="section-label">{label}</span>
          <span className="section-count">{checked(games)} of {games.length}</span>
        </button>
        {!disabled && <span className="section-actions">
          <button onClick={() => { pinAll(); onSelectAll(ids); }}>Select all</button>
          <button onClick={() => { pinAll(); onDeselectAll(ids); }}>Deselect all</button>
        </span>}
      </div>
      {sectionOpen && groups.map(group => {
        const open = !group.name || isOpen(group.name, group.games);
        const gids = group.games.map(g => g.id);
        return (
        <div key={group.name || 'all'} className={'slate-subgroup' + (open ? ' open' : '')}>
          {group.name && (
            <div className="subgroup-heading">
              <button type="button" className="collapse-toggle" aria-expanded={open} onClick={() => pin({ [group.name]: !open })}>
                <span className="chevron" aria-hidden="true" />
                {group.name} <span className="section-count">{checked(group.games)} of {group.games.length}</span>
              </button>
              {!disabled && <span className="section-actions">
                <button onClick={() => { pinAll(); onSelectAll(gids); }}>All</button>
                <button onClick={() => { pinAll(); onDeselectAll(gids); }}>None</button>
              </span>}
            </div>
          )}
          {open && group.games.map(g => {
            const [away, home] = g.competitors;
            const note = noteFor?.(g);
            return (
              <div key={g.id} className="commish-row">
                <label>
                  <input type="checkbox" checked={includedIds.has(g.id)} disabled={disabled} onChange={() => { pinAll(); onToggle(g.id); }} />
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
        );
      })}
    </div>
  );
}
