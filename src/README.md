# How `src/` is organized

Each tab in the app has its own folder under `features/`. If you're changing something you
can see on screen, start in that tab's folder.

```
src/
├── main.jsx              Starts React and loads the styles
├── App.jsx               App shell: header + tabs + the selected screen
├── config.js             SEASON and other season-wide settings
│
├── app/                  The frame around every screen
│   ├── tabs.js           The list of tabs; add a new screen here
│   ├── TopBar.jsx        Brand + light/dark toggle
│   ├── HeroHeader.jsx
│   ├── TabStrip.jsx
│   └── PreviewBanner.jsx "Saves to this browser only" (preview build only)
│
├── features/             One folder per tab
│   ├── picks/            Picks tab: pick winners, rank by confidence
│   ├── scoreboard/       Scoreboard tab: weekly + overall standings
│   ├── bracket/          Bracket tab: CFP bracket pool
│   └── commissioner/     Commish tab: weekly slate + playoff seeding/results
│
├── shared/               Used by more than one feature
│   ├── components/       Centered, TeamLogo, WeekSelect, SubTabs
│   ├── hooks/            useTheme, useWeekSelector, useMediaQuery
│   └── utils/            colors, dates, slugify
│
├── services/             Talking to the outside world
│   ├── espn/             ESPN API: games, rankings, playoff results, team helpers
│   └── data/             Saving + loading (Firestore, or the browser in the preview)
│
└── styles/               CSS, one file per area; index.css imports them in order
```

## Inside a feature folder

Every feature follows the same pattern:

| File / folder           | What goes there                                                   |
| ----------------------- | ----------------------------------------------------------------- |
| `XxxScreen.jsx`         | The tab itself. Wires hooks to components; little logic of its own |
| `components/`           | Pieces of the screen, one per file (e.g. `GameCard.jsx`)           |
| `hooks/`                | State + loading/saving (e.g. `usePicksWeek.js`)                    |
| `xxxLogic.js`           | Plain functions with no React — rules, math, scoring               |

So for the Picks tab: `PicksScreen.jsx` → uses `usePicksWeek` (loads games) and
`useConfidenceOrder` (drag/arrows) → renders `PlayerWeekPanel`, `QuickPicks`, a `GameCard`
per game (each with two `TeamToggle`s and a `ConfidenceControl`), and `SubmitPicks`.

## Imports

`@/` means `src/`, so imports read the same from any folder:

```js
import { SEASON } from '@/config.js';
import { TeamLogo } from '@/shared/components/TeamLogo.jsx';
import { getWeekConfig } from '@/services/data/index.js';
```

Always get data through `@/services/data/index.js`, never from `services/data/firebase/`
directly. That's what lets the preview build swap in browser storage.

## Common changes

- **Bracket points per round:** `ROUND_POINTS` in `features/bracket/bracketLogic.js`
- **Power 4 team list:** `P4_TEAMS` in `services/espn/teams.js`
- **Season year:** `SEASON` in `config.js`
- **Player roster + weekly scores (sample data):** `features/scoreboard/mockScores.json`
- **Sample picks (default games + selections for past weeks):** `features/picks/sample/deandra-2026.json`
- **Colors (light + dark):** `styles/theme.css`
