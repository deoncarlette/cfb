// The one place the app gets and saves data. Always import from here:
//   import { getWeekConfig } from '@/services/data/index.js';
//
// Normal build → Firestore (./firebase).
// `npm run build:cfp` → vite.config.js swaps the line below for ./local/index.js, so the
// preview saves to the browser instead. Keep both folders exporting the same functions.
export * from './firebase/index.js';
