import { useEffect, useMemo, useState } from 'react';
import { SEASON } from '@/config.js';
import { fetchCurrentRankings } from '@/services/espn/index.js';
import { getPlayoffConfig, getAllBrackets } from '@/services/data/index.js';
import { seedMap, eliminatedTeams, projectField } from '../bracketLogic.js';
import { isPast } from '@/shared/utils/dates.js';

// Before the commissioner saves real seeds (Selection Day), the bracket previews the field
// projected from ESPN's current CFP rankings — five automatic bids (Power 4 + top Group of
// Six), Notre Dame if top 12, then at-large by rank — so people can play with it. Submitting
// is disabled until the real field is saved.
function projectedSeeds(teams) {
  return projectField(teams);
}

// Everything the Bracket tab needs from the server: the field, results, lock status, and
// everyone's submitted brackets.
export function useBracketData() {
  const [config, setConfig] = useState(null);
  const [seeds, setSeeds] = useState([]);
  const [projection, setProjection] = useState(null); // { pollName } while previewing
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const cfg = await getPlayoffConfig(SEASON);
        let field = cfg.seeds;
        let proj = null;
        if (field.length !== 12) {
          const ranked = await fetchCurrentRankings();
          if (ranked?.teams?.length >= 12) { field = projectedSeeds(ranked.teams); proj = { pollName: ranked.pollName }; }
          else field = [];
        }
        const all = await getAllBrackets(SEASON);
        if (cancelled) return;
        setConfig(cfg); setSeeds(field); setProjection(proj); setEntries(all);
      } catch (e) {
        if (!cancelled) setError("Couldn't load the bracket. Try again in a moment.");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const bySeed = useMemo(() => seedMap(seeds), [seeds]);
  const results = config?.results || {};
  const anyResults = Object.keys(results).length > 0;
  // Locked once the lock time passes or any real result is in. Never locked in preview.
  const locked = !projection && (anyResults || isPast(config?.lockIso));
  const eliminated = useMemo(() => eliminatedTeams(results, bySeed), [results, bySeed]);

  async function refreshEntries() { setEntries(await getAllBrackets(SEASON)); }

  return {
    config, seeds, bySeed, projection, entries, results, anyResults, locked, eliminated,
    loading, error, refreshEntries
  };
}
