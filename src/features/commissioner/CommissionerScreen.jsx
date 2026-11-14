import { WeekSlatePanel } from './components/WeekSlatePanel.jsx';
import { BracketAdminPanel } from './components/BracketAdminPanel.jsx';

// Commish tab: weekly slate setup and playoff bracket setup. (Insights moved to its own tab,
// open to everyone.)
export function CommissionerScreen() {
  return (
    <div className="pad">
      <WeekSlatePanel />
      <BracketAdminPanel />
    </div>
  );
}
