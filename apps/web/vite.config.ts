import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { VitePWA } from 'vite-plugin-pwa';

const rootEnvDir = resolve(__dirname, '../..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootEnvDir, '');
  const base = '/defuser/';

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['pwa-192.png', 'pwa-512.png'],
        manifest: {
          name: 'Defuser',
          short_name: 'Defuser',
          description: 'Defuser web app',
          start_url: base,
          scope: base,
          display: 'standalone',
          background_color: '#0f172a',
          theme_color: '#0f172a',
          icons: [
            {
              src: 'pwa-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          navigateFallback: '/index.html'
        },
        devOptions: {
          enabled: true,
          suppressWarnings: true
        }
      })
    ],
    envDir: rootEnvDir,
    envPrefix: ['VITE_', 'PUBLIC_'],
    server: {
      host: env.VITE_HOST ?? 'localhost',
      port: Number(env.VITE_PORT ?? 5173),
      strictPort: true,
    },
    preview: {
      host: env.VITE_HOST ?? 'localhost',
      port: Number(env.VITE_PORT ?? 5173)
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@defuser/shared': resolve(__dirname, '../../packages/shared/src/index.ts')
      }
    }
  };
});
