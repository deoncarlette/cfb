import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './client.js';
import { slugify } from '@/shared/utils/slugify.js';

// weeks/{week}                  -> { includedGameIds: string[] | null, deadlineIso: string | null }
// weeks/{week}/picks/{nameSlug} -> { user_name, picks: { [gameId]: { winner, confidence } }, submittedAt }
//
// No Auth yet: picks are keyed by a slug of the name someone types in, so re-submitting the
// same name overwrites their own entry — and nothing stops anyone from typing someone else's
// name. Fine while it's you and testers; add Auth before real stakes. Firestore rules stay
// wide open until then — see firestore.rules.

export async function getWeekConfig(week) {
  const snap = await getDoc(doc(db, 'weeks', String(week)));
  if (!snap.exists()) return { includedGameIds: null, deadlineIso: null };
  const data = snap.data();
  return { includedGameIds: data.includedGameIds ?? null, deadlineIso: data.deadlineIso ?? null };
}

export async function saveWeekConfig(week, includedGameIds, deadlineIso) {
  await setDoc(doc(db, 'weeks', String(week)), {
    includedGameIds: includedGameIds ?? null,
    deadlineIso: deadlineIso ?? null,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function getMyPicks(week, userName) {
  const snap = await getDoc(doc(db, 'weeks', String(week), 'picks', slugify(userName)));
  return snap.exists() ? snap.data() : null;
}

export async function submitPicks(week, userName, picksMap) {
  await setDoc(doc(db, 'weeks', String(week), 'picks', slugify(userName)), {
    user_name: userName,
    picks: picksMap,
    submittedAt: new Date().toISOString()
  });
}

export async function getAllPicksForWeek(week) {
  const snap = await getDocs(collection(db, 'weeks', String(week), 'picks'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
