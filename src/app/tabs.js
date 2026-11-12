import { PicksScreen } from '@/features/picks/PicksScreen.jsx';
import { ScoreboardScreen } from '@/features/scoreboard/ScoreboardScreen.jsx';
import { BracketScreen } from '@/features/bracket/BracketScreen.jsx';
import { CommissionerScreen } from '@/features/commissioner/CommissionerScreen.jsx';

// The app's main tabs, in order. To add a screen: build it in features/, then add it here.
export const TABS = [
  { id: 'picks', label: 'Picks', Screen: PicksScreen },
  { id: 'scoreboard', label: 'Scoreboard', Screen: ScoreboardScreen },
  { id: 'bracket', label: 'Bracket', Screen: BracketScreen },
  { id: 'commish', label: 'Commish', Screen: CommissionerScreen } // no gating yet — Auth comes later
];

export const DEFAULT_TAB = import.meta.env.VITE_DEFAULT_TAB || 'picks';
