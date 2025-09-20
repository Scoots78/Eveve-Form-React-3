import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Updated for production deployment
  base: '/form1-0-0/', // 👈 important for subdirectory deployment
  plugins: [react()],

  /* ------------------------------------------------------------------
     Development-only server tweaks so the embed script works when
     loaded from an external site.

     1.  Enables CORS so `embed.js` can be requested cross-origin.
     2.  Rewrites any request that starts with `/form1-0-0/` to the root
         so `public/embed.js` and other static assets are found without
         having to build.
         e.g.   /form1-0-0/embed.js  --> /embed.js
   ------------------------------------------------------------------ */
  server: {
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    // Small middleware to strip the base path during dev
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url && req.url.startsWith('/form1-0-0/')) {
          req.url = req.url.replace('/form1-0-0', '');
        }
        next();
      });
    },
  },

  // Emit manifest.json to allow embed.js to discover hashed asset filenames
  build: {
    manifest: true,
  },
});