// How much of a logo is near-black? ESPN doesn't say, so draw it once onto a small hidden canvas
// and count. → Promise<number 0–1 | null> (share of the logo's visible pixels that are near-black;
// null = couldn't tell — missing image, or the host doesn't allow reading its pixels).
// Cached per image URL.
const cache = new Map();

export function logoDarkShare(url) {
  if (!url) return Promise.resolve(null);
  if (!cache.has(url)) {
    cache.set(url, new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const size = 40, c = document.createElement('canvas'); c.width = c.height = size;
          const ctx = c.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, size, size);
          const d = ctx.getImageData(0, 0, size, size).data;
          let opaque = 0, dark = 0;
          for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 128) continue;
            opaque++;
            if (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] < 25) dark++; // near-black only; maroon and navy logos stay as they are
          }
          resolve(opaque ? dark / opaque : null);
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    }));
  }
  return cache.get(url);
}
