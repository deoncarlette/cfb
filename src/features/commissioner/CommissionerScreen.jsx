import { WeekSlatePanel } from './components/WeekSlatePanel.jsx';
import { BracketAdminPanel } from './components/BracketAdminPanel.jsx';

// Commish tab: weekly slate setup, then playoff bracket setup.
export function CommissionerScreen() {
  return (
    <div className="pad">
      <WeekSlatePanel />
      <BracketAdminPanel />
    </div>
  );
}
