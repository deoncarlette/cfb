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
import { ReplayScheduleToggle } from '@/shared/components/ReplayScheduleToggle.jsx';
import { replaySchedule } from '@/services/espn/replay.js';
import { quickPickWinners, buildPicksMap, restoreSavedPicks, togglePick, pickResult, weekTotals, liveStanding } from './picksLogic.js';
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
  const viewing = nav.player;
  const setViewing = name => navigate({ player: name });

  // Show a saved entry's picks (yours, or the sample picks) on the cards; null = blank cards.
  function showEntry(entry) {
    if (!entry) { setWinners({}); setOrder(games.map(g => g.id)); return; }
    const restored = restoreSavedPicks(entry, games);
    setWinners(restored.winners);
    setOrder(restored.order);
  }

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
    showEntry(mine || sample);
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

  // Locked week with games underway or done: group into Live / Completed / Upcoming, each by
  // points (highest first). Otherwise one list in confidence order (drag-to-rank stays intact).
  const visible = shown.order.filter(id => gameById[id]);
  const anyStarted = games.some(g => g.completed || g.state === 'in');
  const byPoints = ids => [...ids].sort((a, b) => pointsFor(b) - pointsFor(a));
  const groups = lock.anyLocked && anyStarted
    ? [
        { id: 'live', label: 'Live', ids: byPoints(visible.filter(id => gameById[id].state === 'in')) },
        { id: 'done', label: 'Completed', ids: byPoints(visible.filter(id => gameById[id].completed)) },
        { id: 'next', label: 'Upcoming', ids: byPoints(visible.filter(id => !gameById[id].completed && gameById[id].state !== 'in')) }
      ].filter(g => g.ids.length)
    : [{ id: 'all', label: null, ids: visible }];

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
            <p className="sample-note">{sample?.hidden ? `Everyone's ${label} picks show after 9 PM Saturday.` : `No picks saved for ${viewing} in ${label}.`}</p>
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
                Pick a winner on each card, then drag (or use the arrows/number) to set confidence. Top = most confident.
                {' '}{pickedCount} of {games.length} picked.
              </p>
              <QuickPicks onPick={mode => setWinners(w => ({ ...w, ...quickPickWinners(openGames, mode) }))} disabled={lock.allLocked} />
            </>
          )}
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
                    locked={readOnly}
                    canUp={!readOnly && canMove(gameId, -1)}
                    canDown={!readOnly && canMove(gameId, 1)}
                    pool={poolFor(gameId)}
                    dragProps={dragPropsFor(gameId)}
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
