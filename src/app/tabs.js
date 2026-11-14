import { PicksScreen } from '@/features/picks/PicksScreen.jsx';
import { ScoreboardScreen } from '@/features/scoreboard/ScoreboardScreen.jsx';
import { InsightsScreen } from '@/features/insights/InsightsScreen.jsx';
import { CommissionerScreen } from '@/features/commissioner/CommissionerScreen.jsx';

// The app's main tabs, in order. To add a screen: build it in features/, then add it here.
// (The CFP bracket lives on the Picks tab under Postseason.)
export const TABS = [
  { id: 'picks', label: 'Picks', Screen: PicksScreen },
  { id: 'scoreboard', label: 'Scoreboard', Screen: ScoreboardScreen },
  { id: 'insights', label: 'Insights', Screen: InsightsScreen },
  // Not in the tab strip: opened from the gear in the top bar (only the commish needs it).
  // No gating yet — Auth comes later.
  { id: 'commish', label: 'Commish', Screen: CommissionerScreen, hidden: true }
];

export const DEFAULT_TAB = import.meta.env.VITE_DEFAULT_TAB || 'picks';
