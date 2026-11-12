# Backfield Brainiacs — React + Firebase

Ported from the working Canva-built prototype: Entry Card (drag-to-rank confidence picks),
Scoreboard (Weekly/Overall with movement indicators), and Commissioner tools (pull games from
ESPN, sort into Top 25 / Power 4 / All Other Games, pick a deadline). Backed by Firestore
instead of localStorage, so it actually works as a shared tool across devices — with one big
caveat below.

## No Auth yet — read this before sharing the link widely

There's no login. Anyone with the URL can read and write everything in Firestore, including
overwriting someone else's picks or wiping a week's config (`firestore.rules` is wide open on
purpose — see the comment in that file). That's fine while this is you and a few trusted
testers previewing the app. It is **not** fine once real players with real bragging rights are
using it — come back for an Auth pass (Google Sign-In + Firestore rules that check
`request.auth`) before that happens. The earlier React scaffold's `firestore.rules` has a
worked example with an `isCommissioner` flag if you want a head start on that later.

## 1. Create the Firebase project

1. https://console.firebase.google.com → Add project.
2. Build → Firestore Database → Create database → **production mode** (the rules file here
   overrides the default-deny anyway).
3. Build → Hosting → get started (you don't need to finish the CLI steps it shows you — the
   GitHub Action below handles that part).
4. Project settings → General → "Your apps" → the `</>` (web) icon → register an app → copy
   the `firebaseConfig` object.
5. Paste those values into `src/services/data/firebase/client.js`, replacing the config there. This
   repo can stay **private** on GitHub — Firebase Hosting doesn't require a public repo the
   way GitHub Pages' free tier does, so there's no exposure concern from committing this.
6. Put your actual project ID in `.firebaserc` in place of `YOUR_FIREBASE_PROJECT_ID`.

Auth is **not** enabled in this pass — skip that section in the console for now.

## 2. Deploy the Firestore rules

```
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

## 3. Local development

```
npm install
npm run dev
```

## 4. Deploy to Firebase Hosting (private repo, auto-deploy on push)

Firebase's own CLI sets up the whole GitHub Actions pipeline for you — including creating
and storing the deploy credential as a repo secret, which is the fiddly part to get right by
hand. From this project folder, with the repo already pushed to GitHub:

```
firebase init hosting:github
```

It'll ask which repo (`deoncarlette/cfb-app`) and which branch (`main`) triggers a deploy,
then create `.github/workflows/firebase-hosting-merge.yml` and wire up the secret itself —
nothing to configure manually. After that, every push to `main` deploys automatically to
`https://<your-project-id>.web.app`.


## What's ported vs. what's new

**Ported directly** (same logic, same behavior): ESPN fetch across FBS+FCS (`groups=80,81`),
the `#99`-unranked-placeholder fix, Top 25/Power 4/All Other Games categorization, the
Power 4 team list (same caveat as before — best-effort, not live conference data, worth
checking against the 2026 season), the AP→CFP rank switch at week 10, the drag-to-rank
confidence picker, timezone-aware date formatting (`SAT, 9/26 12:00 PM EDT`, using the
viewer's own browser timezone automatically), and the Weekly/Overall scoreboard with movement
arrows on Overall only.

**Sample data (for now):** the Scoreboard reads weekly scores for Weeks 0–11 from
`src/features/scoreboard/mockScores.json` (Week 11 is made up), and past weeks on the Picks
tab default to Deandra's real picks from `src/features/picks/sample/deandra-2026.json` —
that week's games become the slate and the picks show until someone saves their own. The
Picks tab scores picks against ESPN results; the Scoreboard doesn't yet (it still uses the
file), which is the natural next step.

**New in this version**: real shared persistence via Firestore (localStorage was always
per-device — this is the actual upgrade React+Firebase buys you), and a real deploy pipeline.

## CFP bracket (Bracket tab)

A March Madness–style pool for the 12-team College Football Playoff (seeds 1–4 get byes,
no re-seeding). Lives alongside the weekly pool, same no-Auth name-slug tradeoff.

- **Firestore:** `playoff/{season}` holds the field, lock time, results and the title-game
  total; `playoff/{season}/brackets/{nameSlug}` holds each player's picks + tiebreaker. The
  existing wide-open rules already cover it.
- **Before Selection Day:** the tab previews a straight 1–12 seeding from ESPN's current CFP
  rankings so people can click around. Submitting stays off until the field is saved.
- **Selection Day (Dec 6):** Commissioner tab → *Playoff bracket* → "Fill 1–12 from
  rankings", then fix seeds for the five conference-champion auto-bids (choosing a team
  that's already seeded swaps the two). Set "Brackets lock at" to the first first-round
  kickoff, then Save.
- **During the playoff:** tap winners in the Commissioner bracket, or "Pull results from
  ESPN" (best effort — matches finished postseason games by the two team IDs). Enter the
  title game's combined score for the tiebreaker. Save to publish.
- **Scoring:** `ROUND_POINTS` in `src/features/bracket/bracketLogic.js` (10/20/40/80, max 280). Scores are computed
  live from picks + results, so changing the table rescores everyone. Standings sort by
  points, then max-possible, then tiebreaker. Picks stay hidden until brackets lock.
