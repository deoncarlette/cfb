import { useStoredState } from '@/shared/hooks/useStoredState.js';
import { Segmented } from '@/shared/components/Segmented.jsx';
import { WeekSlatePanel } from './components/WeekSlatePanel.jsx';
import { BracketAdminPanel } from './components/BracketAdminPanel.jsx';
import { InsightsPanel } from './insights/InsightsPanel.jsx';

// Commish tab: Settings (weekly slate setup, playoff bracket setup) | Insights (how the pool
// picked locked games).
export function CommissionerScreen() {
  const [view, setView] = useStoredState('commish-view', 'settings', 'session');
  return (
    <div className="pad">
      <Segmented label="Commish view" options={[['settings', 'Settings'], ['insights', 'Insights']]} value={view} onChange={setView} />
      {view === 'insights' ? <InsightsPanel /> : (
        <>
          <WeekSlatePanel />
          <BracketAdminPanel />
        </>
      )}
    </div>
  );
}
