import { useState } from 'react';
import { backfillPicks } from '@/features/picks/backfill/backfillPicks.js';

// Loads Deandra's reconstructed 2026 picks (weeks 1–11) so past weeks have real data to show.
export function BackfillPanel() {
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true); setResult(null);
    try {
      const { default: file } = await import('@/features/picks/backfill/deandra-2026.json');
      const res = await backfillPicks(file, setStatus);
      setResult(res);
      setStatus('');
    } catch (e) {
      setStatus("Couldn't reach ESPN to match the games. Try again in a moment.");
    }
    setBusy(false);
  }

  return (
    <div className="panel">
      <h2>Past picks</h2>
      <p className="muted small">
        Loads Deandra's picks for weeks 1–11 from the saved file, matched to ESPN's games. Replaces any picks already saved under that name for those weeks.
      </p>
      <button onClick={run} disabled={busy}>{busy ? 'Loading…' : "Load Deandra's past picks"}</button>
      {status && <p className="muted small">{status}</p>}
      {result && (
        <table className="board backfill-report">
          <thead><tr><th>Week</th><th className="num-h">Matched</th><th>Not found</th></tr></thead>
          <tbody>
            {result.report.map(r => (
              <tr key={r.week}>
                <td>{r.week}{r.espnWeek !== r.week && <span className="muted small"> (ESPN wk {r.espnWeek})</span>}</td>
                <td className="num">{r.matched}/{r.total}</td>
                <td className="small">{r.missing.length ? r.missing.join(', ') : <span className="muted">—</span>}{r.flagged > 0 && <span className="muted"> {r.flagged} flagged for review</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {result && <p className="muted small">Open the Picks tab, type “{result.playerName}” as your name, and pick a week.</p>}
    </div>
  );
}
