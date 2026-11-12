import { useState } from 'react';

// The order of game cards = confidence ranking (top = most points).
// Handles drag-and-drop, the ↑/↓ arrows, and typing a point value.
export function useConfidenceOrder() {
  const [order, setOrder] = useState([]);
  const [draggingId, setDraggingId] = useState(null);

  function moveTo(gameId, targetIdx) {
    const cur = order.indexOf(gameId);
    if (cur < 0 || targetIdx === cur) return;
    const next = [...order]; const [moved] = next.splice(cur, 1); next.splice(targetIdx, 0, moved); setOrder(next);
  }

  // dir: -1 = up one, +1 = down one
  function move(gameId, dir) {
    const idx = order.indexOf(gameId);
    const swap = idx + dir;
    if (swap < 0 || swap >= order.length) return;
    const next = [...order]; [next[idx], next[swap]] = [next[swap], next[idx]]; setOrder(next);
  }

  // points: 1..N, where N (highest) belongs at the top of the list.
  function moveToConfidence(gameId, points) {
    const n = order.length;
    const clamped = Math.max(1, Math.min(n, Math.round(points) || 1));
    moveTo(gameId, n - clamped);
  }

  function drop(targetId) {
    const from = order.indexOf(draggingId), to = order.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...order]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); setOrder(next);
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

  return { order, setOrder, move, moveToConfidence, dragPropsFor };
}
