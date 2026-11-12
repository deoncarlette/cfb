// Browser-only (localStorage) versions of every data function — same names and shapes as
// ../firebase. Used by the frontend preview build (npm run build:cfp), so the app runs
// before Firebase is set up. Nothing is shared between people or devices.
export * from './weeklyPicks.js';
export * from './playoff.js';
