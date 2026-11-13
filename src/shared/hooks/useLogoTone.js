import { useEffect, useState } from 'react';
import { logoDarkShare } from '@/shared/utils/logoTone.js';

// Share of a logo that's near-black (0–1), or null (unknown / not asked: pass url = null to skip).
export function useLogoDarkShare(url) {
  const [share, setShare] = useState(null);
  useEffect(() => {
    let alive = true; setShare(null);
    if (url) logoDarkShare(url).then(v => { if (alive) setShare(v); });
    return () => { alive = false; };
  }, [url]);
  return share;
}
