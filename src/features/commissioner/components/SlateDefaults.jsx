import { useEffect, useState } from 'react';
import { getSlateDefaults, saveSlateDefaults } from '@/services/data/index.js';

// Commish defaults for new weeks: teams that are always in and categories that start checked.
// A week nobody has saved yet starts from these (on Commish and on Picks); saved weeks keep
// their own selection. With nothing saved, the built-in rule applies (Top 25, Howard, SEC,
// Big Ten), and the editor starts from a suggestion: Howard, Northwestern and Top 25.
const SUGGESTED = { teams: ['Howard', 'Northwestern'], categories: ['top25'] };
const key = d => JSON.stringify([[...d.teams.map(t => String(t.id))].sort(), [...d.categories].sort()]);

export function SlateDefaults({ games, categories, disabled, onSaved }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(undefined); // undefined = loading, null = never saved
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);

  // Every team playing this week, for the "add a team" list.
  const teams = new Map();
  games.forEach(g => g.competitors.forEach(c => { if (c.id && !teams.has(String(c.id))) teams.set(String(c.id), { id: String(c.id), name: c.name }); }));

  useEffect(() => { getSlateDefaults().then(d => setSaved(d)).catch(() => setSaved(null)); }, []);
  // Start the editor from what's saved, or the suggestion (once this week's teams are known).
  useEffect(() => {
    if (saved === undefined || draft) return;
    if (saved) { setDraft(saved); return; }
    if (!teams.size) return;
    const byName = name => [...teams.values()].find(t => t.name === name);
    setDraft({ teams: SUGGESTED.teams.map(byName).filter(Boolean), categories: SUGGESTED.categories });
  }, [saved, teams.size]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!draft) return null;
  const dirty = !saved || key(saved) !== key(draft);
  const chosen = new Set(draft.teams.map(t => String(t.id)));
  const summary = [
    draft.teams.length ? `Always in: ${draft.teams.map(t => t.name).join(', ')}` : 'No teams always in',
    draft.categories.length ? `Start checked: ${categories.filter(c => draft.categories.includes(c.key)).map(c => c.label).join(', ')}` : null
  ].filter(Boolean).join(' · ');

  async function save() {
    setBusy(true);
    const d = { teams: draft.teams.map(t => ({ id: String(t.id), name: t.name })), categories: [...draft.categories] };
    await saveSlateDefaults(d);
    setSaved(d); setBusy(false);
    onSaved?.(d);
  }

  return (
    <div className={'slate-defaults' + (open ? ' open' : '')}>
      <button type="button" className="slate-defaults-toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span><strong>Defaults for new weeks</strong><span className="muted small">{summary}{!saved ? ' (not saved yet)' : ''}</span></span>
        <span className="chev" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="slate-defaults-body">
          <p className="muted small">A week you haven't saved yet starts with these games selected, here and on Picks. Weeks you've saved keep their own games.{!saved ? ' Until you save, new weeks use the built-in start: Top 25, Howard, SEC and Big Ten.' : ''}</p>

          <label>Always include these teams</label>
          <div className="chip-row">
            {draft.teams.map(t => (
              <span key={t.id} className="chip">{t.name}
                <button type="button" aria-label={`Remove ${t.name}`} disabled={disabled} onClick={() => setDraft(d => ({ ...d, teams: d.teams.filter(x => String(x.id) !== String(t.id)) }))}>×</button>
              </span>
            ))}
            {!draft.teams.length && <span className="muted small">None</span>}
          </div>
          <select aria-label="Add a team" value="" disabled={disabled}
            onChange={e => { const t = teams.get(e.target.value); if (t) setDraft(d => ({ ...d, teams: [...d.teams, t] })); }}>
            <option value="">Add a team playing this week…</option>
            {[...teams.values()].filter(t => !chosen.has(t.id)).sort((a, b) => a.name.localeCompare(b.name)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <label>Start with these categories checked</label>
          <p className="muted small">Same as the sections below — a game with a ranked team counts as Top 25, not its conference.</p>
          <div className="defaults-cats">
            {categories.map(c => (
              <label key={c.key} className="check">
                <input type="checkbox" disabled={disabled} checked={draft.categories.includes(c.key)}
                  onChange={e => setDraft(d => ({ ...d, categories: e.target.checked ? [...d.categories, c.key] : d.categories.filter(k => k !== c.key) }))} />
                {c.label}
              </label>
            ))}
          </div>

          <button type="button" className="primary" onClick={save} disabled={busy || !dirty || disabled}>
            {busy ? 'Saving…' : dirty ? 'Save defaults' : 'Defaults saved'}
          </button>
        </div>
      )}
    </div>
  );
}
