import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Default build: Firebase Hosting serves from the root of its own domain, so no base path.
//
// `npm run build:cfp` (mode "cfp"): frontend preview for GitHub Pages at /cfb/cfp/.
//   - base path /cfb/cfp/ so asset URLs resolve under that folder
//   - firebase.js is swapped for localData.js (browser localStorage), so it runs without
//     Firebase being set up
//   - opens on the Bracket tab (VITE_DEFAULT_TAB in .env.cfp)
//   - output goes to dist-cfp/; copy its contents into the cfb repo's cfp/ folder
export default defineConfig(({ mode }) => {
  const cfp = mode === 'cfp';
  return {
    plugins: [react()],
    base: cfp ? '/cfb/cfp/' : '/',
    build: { outDir: cfp ? 'dist-cfp' : 'dist' },
    resolve: cfp
      ? { alias: [{ find: /^(\.\.?\/)+firebase\.js$/, replacement: fileURLToPath(new URL('./src/localData.js', import.meta.url)) }] }
      : {}
  };
});
