import { SEED_NUMBERS } from '../hooks/usePlayoffAdmin.js';

// Twelve dropdowns, one per seed.
export function SeedPicker({ seedIds, candidates, onAssign }) {
  return (
    <div className="seed-grid">
      {SEED_NUMBERS.map(n => (
        <div key={n} className="seed-row">
          <span className="seed-num">{n}</span>
          <select value={seedIds[n] || ''} onChange={e => onAssign(n, e.target.value)}>
            <option value="">—</option>
            {candidates.map(t => <option key={t.id} value={t.id}>{t.rank ? `#${t.rank} ` : ''}{t.name}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}
