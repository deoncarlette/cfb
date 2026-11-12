import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchEspnGames, applyRankOverlay, gameCategory, displayRank,
  gameStatusLabel, formatKickoff, textForBackground
} from '../espn.js';
import { getWeekConfig, getMyPicks, submitPicks } from '../firebase.js';
import { useWeekSelector } from '../hooks/useWeekSelector.js';
import { Centered } from '../components/Centered.jsx';

export function EntryScreen() {
  const { week, setWeek, weeks } = useWeekSelector(1);
  const [userName, setUserName] = useState('');
  const [allGames, setAllGames] = useState([]);
  const [games, setGames] = useState([]);
  const [config, setConfig] = useState({ includedGameIds: null, deadlineIso: null });
  const [winners, setWinners] = useState({});
  const [order, setOrder] = useState([]);
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  const deadlinePassed = useMemo(() => {
    if (config.deadlineIso) return Date.now() >= new Date(config.deadlineIso).getTime();
    const first = games.reduce((earliest, g) => !earliest || new Date(g.date) < new Date(earliest) ? g.date : earliest, null);
    return first ? Date.now() >= new Date(first).getTime() : false;
  }, [config, games]);

  const loadWeek = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [fetched, cfg] = await Promise.all([
        fetchEspnGames(week, [80]).then(gs => applyRankOverlay(gs, week)),
        getWeekConfig(week)
      ]);
      setAllGames(fetched);
      setConfig(cfg);
      // Until the commissioner explicitly configures a week, default to Top 25 + Power 4
      // rather than the full slate (can be 70+ games some weeks).
      const filtered = cfg.includedGameIds
        ? fetched.filter(g => cfg.includedGameIds.includes(g.id))
        : fetched.filter(g => gameCategory(g) !== 'other');
      setGames(filtered);
      setOrder(filtered.map(g => g.id));
      setWinners({});
      setExisting(null);
    } catch (e) {
      setError("Couldn't reach ESPN. Try again in a moment.");
      setAllGames([]); setGames([]); setOrder([]);
    }
    setLoading(false);
  }, [week]);

  useEffect(() => { loadWeek(); }, [loadWeek]);

  async function loadExistingPicks() {
    if (!userName.trim() || games.length === 0) return;
    const mine = await getMyPicks(week, userName);
    if (!mine) { setExisting(null); return; }
    setExisting(mine);
    const w = {}; const ord = [];
    Object.entries(mine.picks || {}).sort((a, b) => b[1].confidence - a[1].confidence).forEach(([gid, p]) => {
      w[gid] = p.winner; ord.push(gid);
    });
    const missing = games.map(g => g.id).filter(id => !ord.includes(id));
    setWinners(w);
    setOrder([...missing, ...ord].filter(id => games.some(g => g.id === id)));
  }

  const gameById = useMemo(() => Object.fromEntries(games.map(g => [g.id, g])), [games]);
  const pickedCount = games.filter(g => winners[g.id]).length;
  const allPicked = games.length > 0 && pickedCount === games.length;

  function pickWinner(gameId, teamId) { setWinners(w => ({ ...w, [gameId]: teamId })); }
  function move(gameId, dir) {
    const idx = order.indexOf(gameId);
    const swap = idx + dir;
    if (swap < 0 || swap >= order.length) return;
    const next = [...order]; [next[idx], next[swap]] = [next[swap], next[idx]]; setOrder(next);
  }
  function moveToConfidence(gameId, points) {
    // points: 1..N, where N (highest) belongs at the top of the list (most confident).
    const n = order.length;
    const clamped = Math.max(1, Math.min(n, Math.round(points) || 1));
    const targetIdx = n - clamped;
    const cur = order.indexOf(gameId);
    if (cur < 0 || targetIdx === cur) return;
    const next = [...order]; const [moved] = next.splice(cur, 1); next.splice(targetIdx, 0, moved); setOrder(next);
  }
  function onDragStart(id) { setDraggingId(id); }
  function onDrop(id) {
    const from = order.indexOf(draggingId), to = order.indexOf(id);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...order]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); setOrder(next);
    setDraggingId(null);
  }

  function quickPick(mode) {
    const next = {};
    games.forEach(g => {
      const [away, home] = g.competitors;
      if (mode === 'home') next[g.id] = home.id;
      else if (mode === 'away') next[g.id] = away.id;
      else if (mode === 'random') next[g.id] = Math.random() < 0.5 ? away.id : home.id;
    });
    setWinners(next);
  }

  async function handleSubmit() {
    setSaving(true);
    const picksMap = {};
    order.forEach((gameId, idx) => { picksMap[gameId] = { winner: winners[gameId], confidence: order.length - idx }; });
    await submitPicks(week, userName, picksMap);
    setExisting({ picks: picksMap });
    setSavedAt(Date.now());
    setSaving(false);
  }

  return (
    <div className="pad">
      <div className="panel">
        <label>Your name</label>
        <input value={userName} onChange={e => setUserName(e.target.value)} onBlur={loadExistingPicks} placeholder="Type your name" />
        <label>Week</label>
        <select value={week} onChange={e => setWeek(Number(e.target.value))}>
          {weeks.map(w => <option key={w} value={w}>Week {w}</option>)}
        </select>
        {config.deadlineIso && (
          <p className="muted small">Picks lock {formatKickoff(config.deadlineIso)}{deadlinePassed ? ' — locked' : ''}.</p>
        )}
      </div>

      {loading && <Centered>Loading Week {week}'s games…</Centered>}
      {!loading && error && <Centered>{error}</Centered>}
      {!loading && !error && games.length === 0 && <Centered>No games set for Week {week} yet.</Centered>}

      {!loading && !error && games.length > 0 && (
        <>
          <p className="muted small">
            Pick a winner on each card, then drag (or use the arrows/number) to set confidence. Top = most confident.
            {' '}{pickedCount} of {games.length} picked.
          </p>
          <div className="row-gap quickpicks">
            <button type="button" onClick={() => quickPick('random')} disabled={deadlinePassed}>Random</button>
            <button type="button" onClick={() => quickPick('home')} disabled={deadlinePassed}>All home</button>
            <button type="button" onClick={() => quickPick('away')} disabled={deadlinePassed}>All away</button>
          </div>
          {order.map((gameId, idx) => {
            const g = gameById[gameId];
            if (!g) return null;
            const picked = winners[gameId];
            const [away, home] = g.competitors;
            return (
              <div
                key={gameId}
                className={'card-row combo-card' + (!picked ? ' unpicked' : '')}
                draggable={!deadlinePassed}
                onDragStart={() => onDragStart(gameId)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(gameId)}
              >
                <div className="drag-handle">&#8942;&#8942;</div>
                <div className="combo-body">
                  <div className="game-meta"><span>{gameStatusLabel(g)}</span><span>{g.venue}</span></div>
                  <div className="teams-row">
                    {[away, home].map(team => {
                      const isSel = picked === team.id;
                      return (
                        <button
                          key={team.id}
                          type="button"
                          disabled={deadlinePassed}
                          className={'team-toggle' + (isSel ? ' sel' : '')}
                          style={isSel ? { background: team.color, borderColor: team.color, color: textForBackground(team.color) } : undefined}
                          onClick={() => pickWinner(gameId, team.id)}
                        >
                          <span className="team-logo-swatch" style={{ '--swatch-color': team.color }}>
                            {team.logo && <img src={team.logo} alt="" />}
                          </span>
                          {displayRank(team) && <span className="team-rank" style={isSel ? { color: textForBackground(team.color) } : undefined}>#{displayRank(team)}</span>}
                          <span>{team.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="combo-side">
                  <input
                    type="number"
                    className="pts-input"
                    min={1}
                    max={order.length}
                    value={order.length - idx}
                    disabled={deadlinePassed}
                    onChange={e => moveToConfidence(gameId, Number(e.target.value))}
                  />
                  <span className="arrows">
                    <button type="button" onClick={() => move(gameId, -1)} disabled={idx === 0 || deadlinePassed}>&uarr;</button>
                    <button type="button" onClick={() => move(gameId, 1)} disabled={idx === order.length - 1 || deadlinePassed}>&darr;</button>
                  </span>
                </div>
              </div>
            );
          })}

          <button
            className="primary big"
            disabled={!allPicked || !userName.trim() || deadlinePassed || saving}
            onClick={handleSubmit}
          >
            {saving ? 'Saving…' : existing ? 'Update picks' : 'Submit picks'}
          </button>
          {!userName.trim() && <p className="muted small" style={{ textAlign: 'center' }}>Enter your name to submit.</p>}
          {deadlinePassed && <p className="muted small" style={{ textAlign: 'center' }}>Picks are locked for this week.</p>}
          {savedAt && <p className="muted small" style={{ textAlign: 'center' }}>Saved.</p>}
        </>
      )}
    </div>
  );
}
