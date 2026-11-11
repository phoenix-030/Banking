import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const blockedSourcePath =
  /^\/(?:src\/|server\/|scripts\/|\.env|package(?:-lock)?\.json$|tsconfig[^/]*\.json$)|(?:\.map|\.tsx?)(?:\?|$)/i;

function blockSourceExposure(): Plugin {
  return {
    name: 'block-source-exposure',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = (req.url ?? '/').split('?')[0];
        if (blockedSourcePath.test(urlPath)) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.end('Not Found');
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), blockSourceExposure()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: false,
      },
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: false,
      },
    },
    headers: {
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      'Cache-Control': 'no-store',
    },
  },
  oxc: {
    jsx: {
      development: false,
    },
  },
  build: {
    sourcemap: false, // Never expose source code, source maps, or TypeScript files in DevTools
    minify: 'oxc',
    cssMinify: true,
    rolldownOptions: {
      output: {
        entryFileNames: 'assets/app-[hash].js',
        chunkFileNames: 'assets/c-[hash].js',
        assetFileNames: 'assets/a-[hash][extname]',
      },
    },
  },
});
