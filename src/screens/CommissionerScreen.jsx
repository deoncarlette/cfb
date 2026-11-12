import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchEspnGames, applyRankOverlay, gameCategory, displayRank, bestRealRank, gameStatusLabel
} from '../espn.js';
import { getWeekConfig, saveWeekConfig } from '../firebase.js';
import { useWeekSelector } from '../hooks/useWeekSelector.js';
import { BracketAdminPanel } from '../components/BracketAdminPanel.jsx';

export function CommissionerScreen() {
  const { week, setWeek, weeks } = useWeekSelector(1);
  const [games, setGames] = useState([]);
  const [includedIds, setIncludedIds] = useState(new Set());
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState('');
  const [pulling, setPulling] = useState(false);
  const [saving, setSaving] = useState(false);

  function toDatetimeLocal(iso) {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const pullGames = useCallback(async () => {
    setPulling(true);
    setStatus(`Pulling Week ${week} from ESPN…`);
    try {
      let pulled = await fetchEspnGames(week, [80, 81]); // 80 = FBS, 81 = FCS — "all D1"
      pulled = await applyRankOverlay(pulled, week);
      setGames(pulled);
      const cfg = await getWeekConfig(week);
      setIncludedIds(new Set(cfg.includedGameIds ? cfg.includedGameIds : pulled.filter(g => gameCategory(g) === 'top25').map(g => g.id)));
      setDeadline(toDatetimeLocal(cfg.deadlineIso));
      setStatus(`${pulled.length} games pulled for Week ${week}.`);
    } catch (e) {
      setGames([]);
      setStatus("Couldn't reach ESPN. Try again in a moment.");
    }
    setPulling(false);
  }, [week]);

  useEffect(() => { pullGames(); }, [pullGames]);

  const sections = useMemo(() => ([
    { key: 'top25', label: 'Top 25', sort: (a, b) => bestRealRank(a) - bestRealRank(b) || new Date(a.date) - new Date(b.date) },
    { key: 'power4', label: 'Power 4', sort: (a, b) => new Date(a.date) - new Date(b.date) },
    { key: 'other', label: 'All Other Games', sort: (a, b) => new Date(a.date) - new Date(b.date) }
  ]), []);

  function toggle(id) {
    setIncludedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function selectAll(ids) { setIncludedIds(prev => new Set([...prev, ...ids])); }
  function deselectAll(ids) { setIncludedIds(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; }); }

  async function handleSave() {
    setSaving(true);
    const includedGameIds = games.length ? Array.from(includedIds) : null;
    const deadlineIso = deadline ? new Date(deadline).toISOString() : null;
    await saveWeekConfig(week, includedGameIds, deadlineIso);
    setStatus(`Saved. Week ${week}'s Entry card now uses ${includedGameIds ? includedGameIds.length : 'all'} game(s).`);
    setSaving(false);
  }

  return (
    <div className="pad">
      <div className="panel">
        <p className="muted small" style={{ textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 800, color: 'var(--brass)' }}>Commissioner</p>
        <h2>Set up this week's slate</h2>
        <p className="muted small">Pull games from ESPN, choose which count, set when picks lock. No access control yet — see the note in firebase.js.</p>

        <select value={week} onChange={e => setWeek(Number(e.target.value))}>
          {weeks.map(w => <option key={w} value={w}>Week {w}</option>)}
        </select>
        <div className="row-gap">
          <button onClick={pullGames} disabled={pulling}>{pulling ? 'Pulling…' : 'Pull games from ESPN'}</button>
          <span className="muted small" style={{ alignSelf: 'center' }}>{status}</span>
        </div>

        <label>Picks lock at</label>
        <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
        <p className="muted small">Leave blank to fall back to the earliest kickoff among included games.</p>

        <p className="selected-count">{includedIds.size} of {games.length} selected</p>

        {games.length === 0 && !pulling && <p className="muted small">No games pulled yet.</p>}

        {sections.map(section => {
          const inSection = games.filter(g => gameCategory(g) === section.key).sort(section.sort);
          if (!inSection.length) return null;
          const ids = inSection.map(g => g.id);
          return (
            <div key={section.key}>
              <div className="section-heading">
                <span><span className="section-label">{section.label}</span><span className="section-count">({inSection.length})</span></span>
                <span className="section-actions row-gap" style={{ margin: 0 }}>
                  <button onClick={() => selectAll(ids)}>Select all</button>
                  <button onClick={() => deselectAll(ids)}>Deselect all</button>
                </span>
              </div>
              {inSection.map(g => {
                const [away, home] = g.competitors;
                const rankPrefix = t => displayRank(t) ? `#${displayRank(t)} ` : '';
                return (
                  <div key={g.id} className="commish-row">
                    <label>
                      <input type="checkbox" checked={includedIds.has(g.id)} onChange={() => toggle(g.id)} />
                      {rankPrefix(away)}{away.name} @ {rankPrefix(home)}{home.name}
                    </label>
                    <span className="muted small">{gameStatusLabel(g)}</span>
                  </div>
                );
              })}
            </div>
          );
        })}

        <button className="primary big" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : "Save this week's settings"}
        </button>
      </div>

      <BracketAdminPanel />
    </div>
  );
}
