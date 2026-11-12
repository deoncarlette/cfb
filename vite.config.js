import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('./src', import.meta.url));

// Default build (`npm run build`): Firebase Hosting, served from its own domain root.
//
// `npm run build:cfp` (mode "cfp"): frontend preview for GitHub Pages at /cfb/cfp/.
//   - base path /cfb/cfp/ so asset URLs resolve under that folder
//   - src/services/data/index.js loads ./local (browser localStorage) instead of
//     ./firebase, so it runs without Firebase set up
//   - opens on the Bracket tab (VITE_DEFAULT_TAB in .env.cfp)
//   - output goes to dist-cfp/; copy its contents into the cfb repo's cfp/ folder
export default defineConfig(({ mode }) => {
  const cfp = mode === 'cfp';
  const alias = [{ find: /^@\//, replacement: `${src}/` }]; // "@/..." = "src/..."
  if (cfp) alias.unshift({ find: /^\.\/firebase\/index\.js$/, replacement: `${src}/services/data/local/index.js` });
  return {
    plugins: [react()],
    base: cfp ? '/cfb/cfp/' : '/',
    build: { outDir: cfp ? 'dist-cfp' : 'dist' },
    resolve: { alias }
  };
});
