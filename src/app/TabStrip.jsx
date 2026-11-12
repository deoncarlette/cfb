import { TABS } from './tabs.js';

export function TabStrip({ tab, setTab }) {
  return (
    <div className="tabstrip">
      {TABS.map(t => (
        <button key={t.id} className={'tabbtn' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>{t.label}</button>
      ))}
    </div>
  );
}
