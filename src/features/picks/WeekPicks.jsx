import { useEffect, useMemo, useState } from 'react';
import { getMyPicks, submitPicks } from '@/services/data/index.js';
import { formatKickoff } from '@/shared/utils/dates.js';
import { weekLabel } from '@/shared/components/WeekSelect.jsx';
import { Centered } from '@/shared/components/Centered.jsx';
import { usePicksWeek } from './hooks/usePicksWeek.js';
import { useConfidenceOrder } from './hooks/useConfidenceOrder.js';
import { quickPickWinners, buildPicksMap, restoreSavedPicks, togglePick, pickResult, weekTotals, liveStanding } from './picksLogic.js';
import { WeekResults } from './components/WeekResults.jsx';
import { QuickPicks } from './components/QuickPicks.jsx';
import { GameCard } from './components/GameCard.jsx';
import { SubmitPicks } from './components/SubmitPicks.jsx';

// One week's picks (or the bowl games): choose a winner on each game card, then order the
// cards by confidence. Once games go final, each card shows the score and the points earned.
// nameKey changes when the player finishes typing their name, to pull up their saved picks.
export function WeekPicks({ week, userName, nameKey }) {
  const { games, config, sample, loading, error, deadlinePassed, anyLive, updatedAt, isReplay } = usePicksWeek(week);
  const { order, setOrder, move, moveToConfidence, dragPropsFor } = useConfidenceOrder();
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

  const label = week === 'bowls' ? 'the bowl games' : weekLabel(week);
  return (
    <>
      {config.deadlineIso && (
        <p className="muted small">Picks lock {formatKickoff(config.deadlineIso)}{deadlinePassed ? ' — locked' : ''}.</p>
      )}
      {loading && <Centered>Loading {label}…</Centered>}
      {!loading && error && <Centered>{error}</Centered>}
      {!loading && !error && games.length === 0 && (
        <Centered>{week === 'bowls' ? 'Bowl matchups show up here once they’re announced after Selection Day.' : `No games set for ${label} yet.`}</Centered>
      )}

      {!loading && !error && games.length > 0 && (
        <>
          {showingSample && (
            <p className="sample-note">
              Showing {sample.playerName}'s picks{sample.missing.length ? ` (${sample.matched} of ${sample.total} games found on ESPN)` : ''}.
            </p>
          )}
          {isReplay && <p className="sample-note">Test replay: {label}'s games are being re-played today at their real kickoff times.</p>}
          {(totals.decided > 0 || anyLive) && <WeekResults totals={totals} />}
          {anyLive && updatedAt && (
            <p className="muted small center live-updated">Live scores update every 30 seconds. Last updated {updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.</p>
          )}
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
                live={liveStanding(game, winners[gameId])}
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
          {deadlinePassed && <p className="muted small center">Picks are locked.</p>}
        </>
      )}
    </>
  );
}
