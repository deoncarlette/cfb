import { useEffect, useState } from 'react';
import { SEASON } from '@/config.js';
import { getMyBracket, submitBracket } from '@/services/data/index.js';
import { GAMES, togglePick, isComplete } from '../bracketLogic.js';

// The bracket you're filling out: picks, tiebreaker, and saving it under your name (the same
// name as on the Picks tab). nameKey changes when you finish typing a name.
export function useMyBracket({ userName, nameKey, bySeed, projection, locked, onSubmitted }) {
  const [picks, setPicks] = useState({});
  const [tiebreaker, setTiebreaker] = useState('');
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  // Tapping your picked team again clears it.
  function pick(gameKey, teamId) {
    setPicks(p => togglePick(p, gameKey, teamId, bySeed));
    setSavedAt(null);
  }

  function clear() { setPicks({}); setSavedAt(null); }

  // Pull up your saved bracket when the field is set (and whenever you change your name).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadExisting(); }, [nameKey, projection]);
  async function loadExisting() {
    if (!userName.trim() || projection) return;
    const mine = await getMyBracket(SEASON, userName);
    setExisting(mine);
    if (mine) { setPicks(mine.picks || {}); setTiebreaker(mine.tiebreaker ?? ''); }
  }

  async function submit() {
    setSaving(true);
    await submitBracket(SEASON, userName, picks, tiebreaker);
    setExisting({ picks, tiebreaker });
    await onSubmitted?.();
    setSavedAt(Date.now());
    setSaving(false);
  }

  const pickedCount = GAMES.filter(g => picks[g.key]).length;
  const complete = isComplete(picks);
  const canSubmit = complete && !!userName.trim() && tiebreaker !== '' && !locked && !projection && !saving;

  return {
    userName, picks, pick, clear, tiebreaker, setTiebreaker,
    existing, saving, savedAt, loadExisting, submit, pickedCount, complete, canSubmit
  };
}
