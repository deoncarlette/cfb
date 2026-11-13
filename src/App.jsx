import { useTheme } from '@/shared/hooks/useTheme.js';
import { useEffect } from 'react';
import { useStoredState } from '@/shared/hooks/useStoredState.js';
import { useNav, navigate } from '@/shared/nav.js';
import { TopBar } from '@/app/TopBar.jsx';
import { HeroHeader } from '@/app/HeroHeader.jsx';
import { PreviewBanner } from '@/app/PreviewBanner.jsx';
import { TabStrip } from '@/app/TabStrip.jsx';
import { TABS, DEFAULT_TAB } from '@/app/tabs.js';

// App shell only: header, tabs, and whichever screen is selected.
export default function App() {
  // The tab comes from the address (#picks, #scoreboard…) so Back works; the last tab in this
  // browser tab fills in when the address has none.
  const [lastTab, setLastTab] = useStoredState('bb-tab', DEFAULT_TAB, 'session');
  const nav = useNav();
  const tab = TABS.some(t => t.id === nav.tab) ? nav.tab : lastTab;
  useEffect(() => { if (!nav.tab) navigate({ tab: lastTab }, { replace: true }); }, [nav.tab, lastTab]);
  useEffect(() => { if (nav.tab && nav.tab !== lastTab) setLastTab(nav.tab); /* eslint-disable-next-line */ }, [nav.tab]);
  function setTab(id) { if (id !== tab) { navigate({ tab: id, player: '' }); window.scrollTo(0, 0); } }
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
