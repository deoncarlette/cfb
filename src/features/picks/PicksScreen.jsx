import { useEffect, useMemo, useState } from 'react';
import { getMyPicks, submitPicks } from '@/services/data/index.js';
import { useWeekSelector } from '@/shared/hooks/useWeekSelector.js';
import { Centered } from '@/shared/components/Centered.jsx';
import { usePicksWeek } from './hooks/usePicksWeek.js';
import { useConfidenceOrder } from './hooks/useConfidenceOrder.js';
import { quickPickWinners, buildPicksMap, restoreSavedPicks, togglePick } from './picksLogic.js';
import { PlayerWeekPanel } from './components/PlayerWeekPanel.jsx';
import { QuickPicks } from './components/QuickPicks.jsx';
import { GameCard } from './components/GameCard.jsx';
import { SubmitPicks } from './components/SubmitPicks.jsx';

// Picks tab: choose a winner on each game card, then order the cards by confidence.
export function PicksScreen() {
  const { week, setWeek, weeks } = useWeekSelector(1);
  const { games, config, loading, error, deadlinePassed } = usePicksWeek(week);
  const { order, setOrder, move, moveToConfidence, dragPropsFor } = useConfidenceOrder();
  const [userName, setUserName] = useState('');
  const [winners, setWinners] = useState({});
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  // New week loaded → fresh cards in default order.
  useEffect(() => {
    setOrder(games.map(g => g.id));
    setWinners({});
    setExisting(null);
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
          <p className="muted small">
            Pick a winner on each card, then drag (or use the arrows/number) to set confidence. Top = most confident.
            {' '}{pickedCount} of {games.length} picked.
          </p>
          <QuickPicks onPick={mode => setWinners(quickPickWinners(games, mode))} disabled={deadlinePassed} />
          {order.map((gameId, idx) => gameById[gameId] && (
            <GameCard
              key={gameId}
              game={gameById[gameId]}
              index={idx}
              total={order.length}
              picked={winners[gameId]}
              locked={deadlinePassed}
              dragProps={dragPropsFor(gameId)}
              onPick={teamId => setWinners(w => togglePick(w, gameId, teamId))}
              onMove={dir => move(gameId, dir)}
              onSetPoints={points => moveToConfidence(gameId, points)}
            />
          ))}
          <SubmitPicks
            canSubmit={allPicked && !!userName.trim() && !deadlinePassed && !saving}
            saving={saving}
            isUpdate={!!existing}
            missingName={!userName.trim()}
            locked={deadlinePassed}
            saved={!!savedAt}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  );
}
