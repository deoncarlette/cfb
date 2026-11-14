import { useEffect, useMemo, useState } from 'react';
import { getMyPicks, submitPicks } from '@/services/data/index.js';
import { weekLabel } from '@/shared/components/WeekSelect.jsx';
import { Centered } from '@/shared/components/Centered.jsx';
import { usePicksWeek } from './hooks/usePicksWeek.js';
import { useConfidenceOrder } from './hooks/useConfidenceOrder.js';
import { useOtherPlayers } from './hooks/useOtherPlayers.js';
import { PlayerPicker } from './components/PlayerPicker.jsx';
import { LockAlert } from './components/LockAlert.jsx';
import { DEFAULT_PLAYER } from './sample/samplePicks.js';
import { useNav, navigate } from '@/shared/nav.js';
import { Segmented } from '@/shared/components/Segmented.jsx';
import { useStoredState } from '@/shared/hooks/useStoredState.js';
import { fetchPollScores } from '@/services/espn/index.js';
import { ReplayScheduleToggle } from '@/shared/components/ReplayScheduleToggle.jsx';
import { replaySchedule } from '@/services/espn/replay.js';
import { shuffled, quickPickWinners, buildPicksMap, restoreSavedPicks, togglePick, pickResult, weekTotals, liveStanding } from './picksLogic.js';
import { WeekResults } from './components/WeekResults.jsx';
import { QuickPicks } from './components/QuickPicks.jsx';
import { GameCard } from './components/GameCard.jsx';
import { SubmitPicks } from './components/SubmitPicks.jsx';

// One week's picks (or the bowl games): choose a winner on each game card, then order the
// cards by confidence. Once games go final, each card shows the score and the points earned.
// nameKey changes when the player finishes typing their name, to pull up their saved picks.
export function WeekPicks({ week, userName, nameKey }) {
  const { games, sample, loading, error, lock, anyLive, updatedAt, isReplay } = usePicksWeek(week);
  const isLocked = id => lock.lockedIds.has(id);
  const { order, setOrder, move, canMove, moveToConfidence, dragPropsFor } = useConfidenceOrder(isLocked);
  const [winners, setWinners] = useState({});
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  // Whose picks are on the cards: '' = yours; else another player's (in the address, so the
  // Scoreboard can link here and Back returns).
  const nav = useNav();
  const [cardLayout, setCardLayout] = useStoredState('card-layout', 'pill', 'local');
  // Card order: by points (the confidence ranking) or by kickoff. Remembered on this device.
  const [sortBy, setSortBy] = useStoredState('picks-sort', 'points', 'local');
  const viewing = nav.player;
  const setViewing = name => navigate({ player: name });

  // Show a saved entry's picks (yours, or the sample picks) on the cards; null = blank cards.
  // No picks yet on an open week: the cards come up in a random order, so people who skip
  // ranking (or quick-pick) don't all end up with the same confidence order.
  // TODO (Auth pass, see README): shuffle only on a player's first load of the week and save it.
  function showEntry(entry) {
    const blank = !entry || !Object.keys(entry.picks || {}).length;
    if (blank) { setWinners({}); setOrder(withMissedAtBottom(shuffled(games.map(g => g.id)), entry)); return; }
    const restored = restoreSavedPicks(entry, games);
    setWinners(restored.winners);
    setOrder(withMissedAtBottom(restored.order, entry));
  }

  // Missed games — locked with no saved pick (none saved, or only picked on the page and never
  // submitted before kickoff) — can't score, so they take the LOWEST point values still free:
  // the earliest-kicking-off missed game gets the lowest. Locked games with a saved pick keep
  // their spot; open games keep their order in what's left.
  const savedSource = () => existing || sample;
  const isMissed = (id, source = savedSource()) => isLocked(id) && !source?.picks?.[id];
  function withMissedAtBottom(list, source = savedSource()) {
    const kick = id => new Date(games.find(g => g.id === id)?.date || 0).getTime();
    const missed = list.filter(id => isMissed(id, source)).sort((a, b) => kick(b) - kick(a));
    if (!missed.length) return list;
    const free = list.map((id, i) => i).filter(i => !isLocked(list[i]) || isMissed(list[i], source));
    const openIds = list.filter(id => !isLocked(id));
    const next = [...list];
    free.forEach((slot, k) => { next[slot] = k < openIds.length ? openIds[k] : missed[k - openIds.length]; });
    return next;
  }

  // As games lock while the page is open, move newly missed ones to the bottom and drop any
  // unsaved pick on them.
  const lockKey = [...lock.lockedIds].sort().join(',');
  useEffect(() => {
    if (!lock.anyLocked || !order.length) return;
    const next = withMissedAtBottom(order);
    if (next.some((id, i) => id !== order[i])) setOrder(next);
    const drop = Object.keys(winners).filter(id => isMissed(id));
    if (drop.length) setWinners(w => Object.fromEntries(Object.entries(w).filter(([id]) => !drop.includes(id))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockKey, existing, sample]);

  // New week / slate loaded → the sample picks (if this week has them), then yours if you've
  // saved any. Keyed on the game ids, so live score refreshes don't reset anything.
  const slateKey = `${week}:${games.map(g => g.id).join(',')}`;
  useEffect(() => {
    setExisting(null);
    showEntry(sample);
    if (games.length && userName.trim()) loadExistingPicks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slateKey]);
  useEffect(() => { if (nameKey) loadExistingPicks(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [nameKey]);

  async function loadExistingPicks() {
    if (!userName.trim() || games.length === 0) return;
    const saved = await getMyPicks(week, userName);
    // Picks saved before per-game locking kept locked games out; fill those from the sample
    // ballot that was on screen, so they keep their pick and points.
    const fill = saved && sample?.picks
      ? Object.fromEntries(Object.entries(sample.picks).filter(([id]) => isLocked(id) && !saved.picks?.[id]))
      : {};
    const mine = saved && Object.keys(fill).length ? { ...saved, picks: { ...fill, ...saved.picks } } : saved;
    setExisting(mine);
    if (mine) showEntry(mine); // nothing saved under this name: leave the cards as they are
  }

  async function handleSubmit() {
    setSaving(true);
    // Games that have already locked keep the pick they had when they locked — your saved one,
    // or the sample ballot that was showing as yours — or stay unpicked.
    const picksMap = buildPicksMap(order, winners);
    const lockedSource = existing || sample;
    lock.lockedIds.forEach(id => {
      if (lockedSource?.picks?.[id]) picksMap[id] = lockedSource.picks[id]; else delete picksMap[id];
    });
    await submitPicks(week, userName, picksMap);
    setExisting({ picks: picksMap });
    setSavedAt(Date.now());
    setSaving(false);
  }

  const gameById = useMemo(() => Object.fromEntries(games.map(g => [g.id, g])), [games]);
  const pickedCount = games.filter(g => winners[g.id]).length;
  const openGames = games.filter(g => !isLocked(g.id));
  const allPicked = openGames.length > 0 && openGames.every(g => winners[g.id]);

  // Once a game locks, show the confidence actually submitted for it (it can differ from card
  // position if a game was dropped from the slate). Before that, position = points.
  const own = existing || sample; // your picks on the cards

  // Once games lock: look at another player's picks instead (read-only) — only on games that
  // have locked, so nobody sees picks they could still copy.
  const viewingOther = !!viewing && lock.anyLocked;
  const others = useOtherPlayers(week, lock.anyLocked, sample);
  const viewed = viewingOther ? others.entryFor(viewing) : null;
  const viewedPicks = useMemo(() => (viewed ? restoreSavedPicks(viewed, games) : null), [viewed, games]);
  const shown = viewingOther
    ? {
        entry: viewed,
        winners: Object.fromEntries(Object.entries(viewedPicks?.winners || {}).filter(([id]) => isLocked(id))),
        order: (viewedPicks?.order || games.map(g => g.id)).filter(isLocked),
        fullOrder: viewedPicks?.order || games.map(g => g.id)
      }
    : { entry: own, winners, order };

  const showingSample = !viewing && !existing && !!sample;

  // Pool picks for a game's panel: everyone's pick on it, once that game has locked.
  const youName = (userName.trim() || sample?.playerName || '').toLowerCase();
  const poolFor = gameId => (isLocked(gameId) ? others.players.map(name => {
    const p = others.entryFor(name)?.picks?.[gameId];
    return { name, winner: p?.winner ?? null, confidence: Number(p?.confidence) || 0, isYou: name.toLowerCase() === youName };
  }) : null);
  const pointsFor = gameId => {
    const saved = shown.entry?.picks?.[gameId]?.confidence;
    const ranking = shown.fullOrder || order;
    return isLocked(gameId) && saved != null ? saved : ranking.length - ranking.indexOf(gameId);
  };
  const totals = weekTotals(games, shown.winners, pointsFor);

  // Locked week with games underway or done: group into Live / Completed / Upcoming; otherwise
  // one list. Sorted by points (highest first; for the single list, the confidence order itself,
  // so drag-to-rank stays intact) or by kickoff (earliest first, points break ties).
  const visible = shown.order.filter(id => gameById[id]);
  const anyStarted = games.some(g => g.completed || g.state === 'in');
  const byPoints = ids => [...ids].sort((a, b) => pointsFor(b) - pointsFor(a));
  const kickoff = id => new Date(gameById[id].date).getTime() || 0;
  const byKickoff = ids => [...ids].sort((a, b) => kickoff(a) - kickoff(b) || pointsFor(b) - pointsFor(a));
  const sorted = sortBy === 'kickoff' ? byKickoff : byPoints;
  const groups = lock.anyLocked && anyStarted
    ? [
        { id: 'live', label: 'Live', ids: sorted(visible.filter(id => gameById[id].state === 'in')) },
        { id: 'done', label: 'Completed', ids: sorted(visible.filter(id => gameById[id].completed)) },
        { id: 'next', label: 'Upcoming', ids: sorted(visible.filter(id => !gameById[id].completed && gameById[id].state !== 'in')) }
      ].filter(g => g.ids.length)
    : [{ id: 'all', label: null, ids: sortBy === 'kickoff' ? byKickoff(visible) : visible }];

  const label = week === 'bowls' ? 'the bowl games' : weekLabel(week);
  return (
    <>
      {loading && <Centered>Loading {label}…</Centered>}
      {!loading && error && <Centered>{error}</Centered>}
      {!loading && !error && games.length === 0 && (
        <Centered>{week === 'bowls' ? 'Bowl matchups show up here once they’re announced after Selection Day.' : `No games set for ${label} yet.`}</Centered>
      )}

      {!loading && !error && games.length > 0 && (
        <>
          <LockAlert lock={lock} />
          {lock.anyLocked && (
            <PlayerPicker
              value={viewing}
              players={others.players.filter(n => n.toLowerCase() !== userName.trim().toLowerCase())}
              selfLabel={userName.trim() || 'Me'}
              onChange={setViewing}
            />
          )}
          {viewing && !lock.anyLocked && (
            <p className="sample-note">{viewing}'s {label} picks show once games lock. <button type="button" className="link" onClick={() => setViewing('')}>Show mine</button></p>
          )}
          {viewingOther && !viewed && (
            <p className="sample-note">{sample?.hidden ? `Everyone's ${label} picks show after 8 PM Friday.` : `No picks saved for ${viewing} in ${label}.`}</p>
          )}
          {viewingOther && viewed?.isMock && <p className="sample-note">Some of {viewing}'s picks are simulated for this preview.</p>}
          {!viewing && !existing && sample && !sample.playerName && !sample.hidden && (
            <p className="sample-note">{DEFAULT_PLAYER} didn't play {label}. Choose a player above to see their picks.</p>
          )}
          {showingSample && sample.playerName && (
            <p className="sample-note">
              {`Showing ${sample.playerName}'s picks${sample.isMock ? ' (some simulated for this preview)' : ''}`}{sample.missing.length ? ` (${sample.matched} of ${sample.total} games found on ESPN)` : ''}.
            </p>
          )}
          {games.some(g => g.simulated) && (
            <p className="sample-note">Simulated bowl matchups: ESPN hasn't set this season's bowl teams yet, so these are built from current rankings and records. The real matchups replace them once ESPN has them (usually early December).</p>
          )}
          {isReplay && (
            <div className="sample-note">
              Test replay: {label}'s games are re-played today at their real kickoff times.
              {replaySchedule() === 'twice' && ' Live previews: each game also plays live 12 hours away from its kickoff (e.g. an 8 PM game at 8 AM). Previews never count; afterward the game goes back to its real state.'}
              <ReplayScheduleToggle />
            </div>
          )}
          {(totals.decided > 0 || anyLive) && (!viewingOther || viewed) && <WeekResults totals={totals} />}
          {anyLive && updatedAt && (
            <p className="muted small center live-updated">Live scores update every 30 seconds. Last updated {updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.</p>
          )}
          {!lock.allLocked && !viewingOther && (
            <>
              <p className="muted small">
                {sortBy === 'points'
                  ? 'Pick a winner on each card, then drag (or use the arrows/number) to set confidence. Top = most confident.'
                  : 'Sorted by kickoff: pick winners and set points with the arrows or number. Switch to Points to drag cards into order.'}
                {' '}{pickedCount} of {games.length} picked.
              </p>
              <QuickPicks
                onPick={async mode => {
                  // Higher ranked needs this week's polls (the ones out before its games).
                  const polls = mode === 'ranked' ? await fetchPollScores(typeof week === 'number' ? Math.max(1, week) : null) : null;
                  setWinners(w => mode === 'clear'
                    ? Object.fromEntries(Object.entries(w).filter(([id]) => isLocked(id)))
                    : { ...w, ...quickPickWinners(openGames, mode, polls) });
                }}
                disabled={lock.allLocked}
              />
            </>
          )}
          <div className="layout-trial">
            <span>Card layout (trial)</span>
            <Segmented label="Card layout" options={[['pill', 'Pill'], ['whole', 'Whole card'], ['teams', 'Teams only']]} value={cardLayout} onChange={setCardLayout} />
          </div>
          <div className="layout-trial">
            <span>Sort by</span>
            <Segmented label="Sort games by" options={[['points', 'Points'], ['kickoff', 'Kickoff']]} value={sortBy} onChange={setSortBy} />
          </div>
          {!(viewingOther && !viewed) && groups.map(group => (
            <section key={group.id} className="game-group">
              {group.label && <h3 className="game-group-head">{group.label} <span>{group.ids.length}</span></h3>}
              {group.ids.map(gameId => {
                const game = gameById[gameId];
                const readOnly = viewingOther || isLocked(gameId);
                return (
                  <GameCard
                    key={gameId}
                    game={game}
                    total={order.length}
                    points={pointsFor(gameId)}
                    result={pickResult(game, shown.winners[gameId], pointsFor(gameId))}
                    live={liveStanding(game, shown.winners[gameId])}
                    picked={shown.winners[gameId]}
                    missed={!viewingOther && isMissed(gameId)}
                    layout={cardLayout}
                    locked={readOnly}
                    canUp={!readOnly && canMove(gameId, -1)}
                    canDown={!readOnly && canMove(gameId, 1)}
                    pool={poolFor(gameId)}
                    dragProps={sortBy === 'points' ? dragPropsFor(gameId) : undefined}
                    onPick={teamId => setWinners(w => togglePick(w, gameId, teamId))}
                    onMove={dir => move(gameId, dir)}
                    onSetPoints={points => moveToConfidence(gameId, points)}
                  />
                );
              })}
            </section>
          ))}
          {!lock.allLocked && !viewingOther && (
            <SubmitPicks
              canSubmit={allPicked && !!userName.trim() && !saving}
              saving={saving}
              isUpdate={!!existing}
              missingName={!userName.trim()}
              locked={false}
              saved={!!savedAt}
              onSubmit={handleSubmit}
            />
          )}
          {lock.allLocked && <p className="muted small center">Picks are locked.</p>}
        </>
      )}
    </>
  );
}
