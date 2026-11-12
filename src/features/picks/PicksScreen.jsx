import { useState } from 'react';
import { POSTSEASON } from '@/services/espn/index.js';
import { useWeekSelector } from '@/shared/hooks/useWeekSelector.js';
import { useStoredState } from '@/shared/hooks/useStoredState.js';
import { SubTabs } from '@/shared/components/SubTabs.jsx';
import { BracketScreen } from '@/features/bracket/BracketScreen.jsx';
import { PlayerWeekPanel } from './components/PlayerWeekPanel.jsx';
import { WeekPicks } from './WeekPicks.jsx';

const POSTSEASON_VIEWS = [{ id: 'cfp', label: 'CFP Bracket' }, { id: 'bowls', label: 'Bowl Games' }];

// Picks tab: your name and the week, then that week's games. Choosing "Postseason" (the app
// switches there on its own once ESPN does) shows two sub-tabs: the CFP bracket and bowl picks.
export function PicksScreen() {
  const { week, setWeek, weeks } = useWeekSelector(1);
  const [userName, setUserName] = useStoredState('bb-player-name', '');
  const [nameKey, setNameKey] = useState(0); // bumps when the name field is left, to load saved picks
  const [postView, setPostView] = useStoredState('bb-post-view', 'cfp', 'session');
  const post = week === POSTSEASON;

  return (
    <>
      <div className="pad pad-head">
        <PlayerWeekPanel
          userName={userName} onNameChange={setUserName} onNameBlur={() => setNameKey(k => k + 1)}
          week={week} weeks={weeks} onWeekChange={setWeek}
        />
        {post && <SubTabs options={POSTSEASON_VIEWS} value={postView} onChange={setPostView} />}
      </div>
      {post && postView === 'cfp'
        ? <BracketScreen userName={userName} nameKey={nameKey} />
        : <div className="pad"><WeekPicks key={week} week={week} userName={userName} nameKey={nameKey} /></div>}
    </>
  );
}
