import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './client.js';
import { slugify } from '@/shared/utils/slugify.js';

// playoff/{season}                  -> { seeds: [{ seed, id, name, abbr, logo, color, record }] | [],
//                                        lockIso, results: { [gameKey]: teamId }, championshipTotal }
// playoff/{season}/brackets/{slug}  -> { user_name, picks: { [gameKey]: teamId }, tiebreaker, submittedAt }
// Same no-Auth, name-slug tradeoff as weekly picks.

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
