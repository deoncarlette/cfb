import { WeekSlatePanel } from './components/WeekSlatePanel.jsx';
import { BracketAdminPanel } from './components/BracketAdminPanel.jsx';
import { BackfillPanel } from './components/BackfillPanel.jsx';

// Commish tab: weekly slate setup, playoff bracket setup, and loading past picks.
export function CommissionerScreen() {
  return (
    <div className="pad">
      <WeekSlatePanel />
      <BracketAdminPanel />
      <BackfillPanel />
    </div>
  );
}
