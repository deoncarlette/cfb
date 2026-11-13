import { useState } from 'react';

// The order of game cards = confidence ranking (top = most points).
// Handles drag-and-drop, the ↑/↓ arrows, and typing a point value.
// isFixed(gameId): that game is locked (its kickoff passed), so it keeps its spot and its
// points; everything else moves around it.
export function useConfidenceOrder(isFixed = () => false) {
  const [order, setOrder] = useState([]);
  const [draggingId, setDraggingId] = useState(null);

  // Move gameId to position targetIdx, shuffling only the unlocked games.
  function moveTo(gameId, targetIdx) {
    const cur = order.indexOf(gameId);
    if (cur < 0 || targetIdx === cur || isFixed(gameId) || isFixed(order[targetIdx])) return;
    const slots = order.map((id, i) => i).filter(i => !isFixed(order[i]));
    const free = slots.map(i => order[i]);
    free.splice(free.indexOf(gameId), 1);
    free.splice(slots.indexOf(targetIdx), 0, gameId);
    const next = [...order];
    slots.forEach((slot, k) => { next[slot] = free[k]; });
    setOrder(next);
  }

  // The nearest unlocked spot above (dir -1) or below (dir +1), or -1.
  function neighbor(gameId, dir) {
    for (let i = order.indexOf(gameId) + dir; i >= 0 && i < order.length; i += dir) if (!isFixed(order[i])) return i;
    return -1;
  }
  const canMove = (gameId, dir) => !isFixed(gameId) && neighbor(gameId, dir) !== -1;

  // dir: -1 = up one, +1 = down one (hopping over locked games)
  function move(gameId, dir) {
    const idx = order.indexOf(gameId), swap = neighbor(gameId, dir);
    if (idx < 0 || swap < 0 || isFixed(gameId)) return;
    const next = [...order]; [next[idx], next[swap]] = [next[swap], next[idx]]; setOrder(next);
  }

  // points: 1..N, where N (highest) belongs at the top of the list.
  function moveToConfidence(gameId, points) {
    const n = order.length;
    const clamped = Math.max(1, Math.min(n, Math.round(points) || 1));
    moveTo(gameId, n - clamped);
  }

  function drop(targetId) {
    if (draggingId) moveTo(draggingId, order.indexOf(targetId));
    setDraggingId(null);
  }

  // Spread onto a card: <div {...dragPropsFor(id)}>
  function dragPropsFor(gameId) {
    return {
      onDragStart: () => setDraggingId(gameId),
      onDragOver: e => e.preventDefault(),
      onDrop: () => drop(gameId)
    };
  }

  return { order, setOrder, move, canMove, moveToConfidence, dragPropsFor };
}
