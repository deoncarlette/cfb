import { useState } from 'react';
import { Centered } from '@/shared/components/Centered.jsx';
import { SubTabs } from '@/shared/components/SubTabs.jsx';
import { pickStatus } from './bracketLogic.js';
import { useBracketData } from './hooks/useBracketData.js';
import { useMyBracket } from './hooks/useMyBracket.js';
import { BracketIntro } from './components/BracketIntro.jsx';
import { BracketEntryForm } from './components/BracketEntryForm.jsx';
import { BracketView } from './components/BracketView.jsx';
import { BracketActions } from './components/BracketActions.jsx';
import { BracketStandings } from './components/BracketStandings.jsx';
import { PlayerBracket } from './components/PlayerBracket.jsx';

const VIEWS = [{ id: 'mine', label: 'My bracket' }, { id: 'standings', label: 'Standings' }];

// CFP Bracket (Picks tab → Postseason): fill out your bracket, or see the standings.
export function BracketScreen({ userName = '', nameKey = 0 }) {
  const [view, setView] = useState('mine');
  const [viewing, setViewing] = useState(null); // someone else's bracket, after lock
  const data = useBracketData();
  const my = useMyBracket({ userName, nameKey, bySeed: data.bySeed, projection: data.projection, locked: data.locked, onSubmitted: data.refreshEntries });
  const { config, seeds, projection, entries, results, anyResults, locked, eliminated } = data;
  const ready = seeds.length === 12;

  if (data.loading) return <div className="pad"><Centered>Loading the bracket…</Centered></div>;
  if (data.error) return <div className="pad"><Centered>{data.error}</Centered></div>;

  return (
    <div className="bracket-page">
      <div className="pad bracket-pad">
        <div className="panel">
          <BracketIntro />
          <SubTabs options={VIEWS} value={view} onChange={setView} />
          {view === 'mine' && <BracketEntryForm projection={projection} ready={ready} my={my} locked={locked} lockIso={config?.lockIso} />}
        </div>
      </div>

      {view === 'mine' && !ready && (
        <div className="pad"><Centered>The bracket shows up once rankings are out.</Centered></div>
      )}

      {view === 'mine' && ready && (
        <>
          <div className="bracket-wrap">
            <BracketView
              seeds={seeds}
              winners={my.picks}
              onPick={my.pick}
              statusFor={anyResults ? key => pickStatus(key, my.picks, results, eliminated) : null}
              locked={locked}
            />
          </div>
          <BracketActions my={my} projection={projection} locked={locked} />
        </>
      )}

      {view === 'standings' && (
        <div className="pad bracket-pad">
          <div className="panel">
            <BracketStandings
              entries={entries} results={results} bySeed={data.bySeed} seeds={seeds} locked={locked}
              championshipTotal={config?.championshipTotal ?? null} onOpen={setViewing}
            />
            {locked && entries.length > 0 && <p className="muted small">Tap a player to see their bracket.</p>}
          </div>
        </div>
      )}

      {view === 'standings' && viewing && (
        <PlayerBracket entry={viewing} seeds={seeds} results={results} anyResults={anyResults} eliminated={eliminated} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}
