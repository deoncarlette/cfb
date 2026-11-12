import { initializeApp } from 'firebase/app';
import {
  getFirestore, doc, getDoc, setDoc, collection, getDocs
} from 'firebase/firestore';

// ---- FILL THIS IN from Firebase Console > Project Settings > Your apps > Web app ----
// const firebaseConfig = {
//   apiKey: 'YOUR_API_KEY',
//   authDomain: 'YOUR_PROJECT.firebaseapp.com',
//   projectId: 'YOUR_PROJECT',
//   storageBucket: 'YOUR_PROJECT.appspot.com',
//   messagingSenderId: 'YOUR_SENDER_ID',
//   appId: 'YOUR_APP_ID'
// };

const firebaseConfig = {
  apiKey: "AIzaSyA__hAnl7z3cjS-HPVK7RjcqqgvwBmIRMo",
  authDomain: "cfb-app-77d62.firebaseapp.com",
  projectId: "cfb-app-77d62",
  storageBucket: "cfb-app-77d62.firebasestorage.app",
  messagingSenderId: "240609478451",
  appId: "1:240609478451:web:e2aac50fd6b77b9c5c2046",
  measurementId: "G-DNVB9TZ6QD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ---- Firestore layout ----
// weeks/{week}                     -> { includedGameIds: string[] | null, deadlineIso: string | null }
// weeks/{week}/picks/{nameSlug}    -> { user_name, picks: { [gameId]: { winner, confidence } }, submittedAt }
//
// No Auth yet: picks are keyed by a slug of the name someone types in, so re-submitting the
// same name overwrites their own entry — there's nothing stopping anyone from typing someone
// else's name and overwriting their picks. That's the tradeoff of holding off on Auth for
// now; fine while it's just you and testers, not fine once real prizes/bragging rights are
// on the line. Firestore rules should stay wide open (`allow read, write: if true`) until
// Auth is added — see firestore.rules.

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'player';
}

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

// ---- CFP bracket ----
// playoff/{season}                  -> { seeds: [{ seed, id, name, abbr, logo, color, record }] | [],
//                                        lockIso, results: { [gameKey]: teamId }, championshipTotal }
// playoff/{season}/brackets/{slug}  -> { user_name, picks: { [gameKey]: teamId }, tiebreaker, submittedAt }
// Same no-Auth, name-slug tradeoff as weekly picks above.

export async function getPlayoffConfig(season) {
  const snap = await getDoc(doc(db, 'playoff', String(season)));
  const data = snap.exists() ? snap.data() : {};
  return {
    seeds: data.seeds ?? [],
    lockIso: data.lockIso ?? null,
    results: data.results ?? {},
    championshipTotal: data.championshipTotal ?? null
  };
}

export async function savePlayoffConfig(season, config) {
  await setDoc(doc(db, 'playoff', String(season)), {
    ...config,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function getMyBracket(season, userName) {
  const snap = await getDoc(doc(db, 'playoff', String(season), 'brackets', slugify(userName)));
  return snap.exists() ? snap.data() : null;
}

export async function submitBracket(season, userName, picks, tiebreaker) {
  await setDoc(doc(db, 'playoff', String(season), 'brackets', slugify(userName)), {
    user_name: userName.trim(),
    picks,
    tiebreaker: tiebreaker === '' || tiebreaker == null ? null : Number(tiebreaker),
    submittedAt: new Date().toISOString()
  });
}

export async function getAllBrackets(season) {
  const snap = await getDocs(collection(db, 'playoff', String(season), 'brackets'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllPicksForWeek(week) {
  const snap = await getDocs(collection(db, 'weeks', String(week), 'picks'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
