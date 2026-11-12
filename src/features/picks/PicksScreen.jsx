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
  const { games, config, sample, loading, error, deadlinePassed } = usePicksWeek(week);
  const { order, setOrder, move, moveToConfidence, dragPropsFor } = useConfidenceOrder();
  const [userName, setUserName] = useStoredState('bb-player-name', '');
  const [winners, setWinners] = useState({});
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  // Show a saved entry's picks (yours, or the sample picks) on the cards; null = blank cards.
  function showEntry(entry) {
    if (!entry) { setWinners({}); setOrder(games.map(g => g.id)); return; }
    const restored = restoreSavedPicks(entry, games);
    setWinners(restored.winners);
    setOrder(restored.order);
  }

  // New week loaded → the sample picks (if this week has them), then yours if you've saved any.
  useEffect(() => {
    setExisting(null);
    showEntry(sample);
    if (games.length && userName.trim()) loadExistingPicks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games]);

  async function loadExistingPicks() {
    if (!userName.trim() || games.length === 0) return;
    const mine = await getMyPicks(week, userName);
    setExisting(mine);
    showEntry(mine || sample);
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
  const entry = existing || sample; // what's on the cards
  const showingSample = !existing && !!sample;
  const pointsFor = gameId => {
    const saved = entry?.picks?.[gameId]?.confidence;
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
          {showingSample && (
            <p className="sample-note">
              Showing {sample.playerName}'s picks{sample.missing.length ? ` (${sample.matched} of ${sample.total} games found on ESPN)` : ''}.
            </p>
          )}
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
          {deadlinePassed && <p className="muted small center">Picks are locked for this week.</p>}
        </>
      )}
    </div>
  );
}
