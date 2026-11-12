import { useState } from 'react';
import { useTheme } from './hooks/useTheme.js';
import { TopBar } from './components/TopBar.jsx';
import { HeroHeader } from './components/HeroHeader.jsx';
import { TabStrip } from './components/TabStrip.jsx';
import { EntryScreen } from './screens/EntryScreen.jsx';
import { ScoreboardScreen } from './screens/ScoreboardScreen.jsx';
import { CommissionerScreen } from './screens/CommissionerScreen.jsx';
import { BracketScreen } from './screens/BracketScreen.jsx';

export default function App() {
  const [tab, setTab] = useState(import.meta.env.VITE_DEFAULT_TAB || 'entry');
  const theme = useTheme();
  // This is a test.

  return (
    <div className="app-shell">
      <TopBar theme={theme} />
      <div className="screen">
        <HeroHeader />
        {import.meta.env.VITE_LOCAL_DATA === '1' && (
          <p className="preview-banner">Frontend preview — picks and settings save to this browser only.</p>
        )}
        <TabStrip tab={tab} setTab={setTab} />
        {tab === 'entry' && <EntryScreen />}
        {tab === 'scoreboard' && <ScoreboardScreen />}
        {tab === 'bracket' && <BracketScreen />}
        {tab === 'commish' && <CommissionerScreen />}
      </div>
    </div>
  );
}
