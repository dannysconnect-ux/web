import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

// Since we are now using a static sitemap.xml in the /public folder,
// the sitemap plugin and this routes array are no longer needed.

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'BooxClash',
        short_name: 'BooxClash',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#6d28d9',
        orientation: 'portrait-primary',
        description: 'Offline-first lessons, blazing-fast assessments.',
        icons: [
          { src: '/icon.svg', sizes: '192x192', type: 'image/png' },
          { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' },
          {
            src: '/icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable any',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',  // ✔ FIX: must be index.html, not "/"
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,

        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === 'script' ||
              request.destination === 'style' ||
              request.destination === 'worker',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'assets-cache' },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
    visualizer({
      open: true,
      filename: 'stats.html',
      template: 'treemap',
    }),
    // The ViteSitemapPlugin has been removed.
    // Ensure you have created a `sitemap.xml` file in your `/public` directory.
  ],
});