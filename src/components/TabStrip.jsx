export function TabStrip({ tab, setTab }) {
  const items = [
    { id: 'entry', label: 'Picks' },
    { id: 'scoreboard', label: 'Scoreboard' },
    { id: 'bracket', label: 'Bracket' },
    { id: 'commish', label: 'Commish' } // no gating yet — Auth is coming later, see note in firebase.js
  ];
  return (
    <div className="tabstrip">
      {items.map(i => (
        <button key={i.id} className={'tabbtn' + (tab === i.id ? ' active' : '')} onClick={() => setTab(i.id)}>{i.label}</button>
      ))}
    </div>
  );
}
