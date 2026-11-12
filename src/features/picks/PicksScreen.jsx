import { useEffect, useMemo, useState } from 'react';
import { getMyPicks, submitPicks } from '@/services/data/index.js';
import { useWeekSelector } from '@/shared/hooks/useWeekSelector.js';
import { useStoredState } from '@/shared/hooks/useStoredState.js';
import { Centered } from '@/shared/components/Centered.jsx';
import { usePicksWeek } from './hooks/usePicksWeek.js';
import { useConfidenceOrder } from './hooks/useConfidenceOrder.js';
import { quickPickWinners, buildPicksMap, restoreSavedPicks, togglePick, pickResult, weekTotals } from './picksLogic.js';
import { PlayerWeekPanel } from './components/PlayerWeekPanel.jsx';
import { WeekResults } from './components/WeekResults.jsx';
import { QuickPicks } from './components/QuickPicks.jsx';
import { GameCard } from './components/GameCard.jsx';
import { SubmitPicks } from './components/SubmitPicks.jsx';

// Picks tab: choose a winner on each game card, then order the cards by confidence.
// Once games go final, each card shows the score and the points you earned.
export function PicksScreen() {
  const { week, setWeek, weeks } = useWeekSelector(1);
  const { games, config, loading, error, deadlinePassed } = usePicksWeek(week);
  const { order, setOrder, move, moveToConfidence, dragPropsFor } = useConfidenceOrder();
  const [userName, setUserName] = useStoredState('bb-player-name', '');
  const [winners, setWinners] = useState({});
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  // New week loaded → fresh cards, then pull up your saved picks for it (if your name's in).
  useEffect(() => {
    setOrder(games.map(g => g.id));
    setWinners({});
    setExisting(null);
    if (games.length && userName.trim()) loadExistingPicks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games, setOrder]);

  async function loadExistingPicks() {
    if (!userName.trim() || games.length === 0) return;
    const mine = await getMyPicks(week, userName);
    setExisting(mine);
    if (!mine) return;
    const restored = restoreSavedPicks(mine, games);
    setWinners(restored.winners);
    setOrder(restored.order);
  }

  async function handleSubmit() {
    setSaving(true);
    const picksMap = buildPicksMap(order, winners);
    await submitPicks(week, userName, picksMap);
    setExisting({ picks: picksMap });
    setSavedAt(Date.now());
    setSaving(false);
  }

  const gameById = useMemo(() => Object.fromEntries(games.map(g => [g.id, g])), [games]);
  const pickedCount = games.filter(g => winners[g.id]).length;
  const allPicked = games.length > 0 && pickedCount === games.length;

  // Once picks lock, show the confidence you actually submitted (it can differ from card
  // position if a game was dropped from the slate). Before that, position = points.
  const pointsFor = gameId => {
    const saved = existing?.picks?.[gameId]?.confidence;
    return deadlinePassed && saved != null ? saved : order.length - order.indexOf(gameId);
  };
  const totals = weekTotals(games, winners, pointsFor);

  return (
    <div className="pad">
      <PlayerWeekPanel
        userName={userName} onNameChange={setUserName} onNameBlur={loadExistingPicks}
        week={week} weeks={weeks} onWeekChange={setWeek}
        deadlineIso={config.deadlineIso} locked={deadlinePassed}
      />

      {loading && <Centered>Loading Week {week}'s games…</Centered>}
      {!loading && error && <Centered>{error}</Centered>}
      {!loading && !error && games.length === 0 && <Centered>No games set for Week {week} yet.</Centered>}

      {!loading && !error && games.length > 0 && (
        <>
          {totals.decided > 0 && <WeekResults totals={totals} />}
          {!deadlinePassed && (
            <>
              <p className="muted small">
                Pick a winner on each card, then drag (or use the arrows/number) to set confidence. Top = most confident.
                {' '}{pickedCount} of {games.length} picked.
              </p>
              <QuickPicks onPick={mode => setWinners(quickPickWinners(games, mode))} disabled={deadlinePassed} />
            </>
          )}
          {order.map((gameId, idx) => {
            const game = gameById[gameId];
            if (!game) return null;
            return (
              <GameCard
                key={gameId}
                game={game}
                index={idx}
                total={order.length}
                points={pointsFor(gameId)}
                result={pickResult(game, winners[gameId], pointsFor(gameId))}
                picked={winners[gameId]}
                locked={deadlinePassed}
                dragProps={dragPropsFor(gameId)}
                onPick={teamId => setWinners(w => togglePick(w, gameId, teamId))}
                onMove={dir => move(gameId, dir)}
                onSetPoints={points => moveToConfidence(gameId, points)}
              />
            );
          })}
          {!deadlinePassed && (
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
          {deadlinePassed && !existing && userName.trim() && <p className="muted small center">No picks saved for {userName} in Week {week}.</p>}
          {deadlinePassed && <p className="muted small center">Picks are locked for this week.</p>}
        </>
      )}
    </div>
  );
}
