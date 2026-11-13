import { useEffect, useState } from 'react';
import { logoTone } from '@/shared/utils/logoTone.js';

// 'dark' | 'light' | null (unknown / not asked: pass url = null to skip).
export function useLogoTone(url) {
  const [tone, setTone] = useState(null);
  useEffect(() => {
    let alive = true; setTone(null);
    if (url) logoTone(url).then(t => { if (alive) setTone(t); });
    return () => { alive = false; };
  }, [url]);
  return tone;
}
