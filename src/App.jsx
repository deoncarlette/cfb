import { useTheme } from '@/shared/hooks/useTheme.js';
import { useStoredState } from '@/shared/hooks/useStoredState.js';
import { TopBar } from '@/app/TopBar.jsx';
import { HeroHeader } from '@/app/HeroHeader.jsx';
import { PreviewBanner } from '@/app/PreviewBanner.jsx';
import { TabStrip } from '@/app/TabStrip.jsx';
import { TABS, DEFAULT_TAB } from '@/app/tabs.js';

// App shell only: header, tabs, and whichever screen is selected.
export default function App() {
  const [tab, setTab] = useStoredState('bb-tab', DEFAULT_TAB, 'session'); // survives a reload
  const theme = useTheme();
  const { Screen } = TABS.find(t => t.id === tab) || TABS[0];

  return (
    <div className="app-shell">
      <TopBar theme={theme} />
      <div className="screen">
        <HeroHeader />
        <PreviewBanner />
        <TabStrip tab={tab} setTab={setTab} />
        <Screen />
      </div>
    </div>
  );
}
