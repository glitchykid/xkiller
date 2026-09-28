import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
export default defineConfig({
  plugins: [svelte()],
  base: './',
  server: {
    watch: {
      ignored: [
        '**/.local/**',
        '**/release/**',
        '**/artifacts/**',
        '**/backend/**',
        '**/tests/**',
        '**/dist-electron/**',
      ],
    },
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy:
      process.env.XKILLER_WEB === '1'
        ? {
            '/api': {
              target: 'http://127.0.0.1:5078',
              headers: { 'X-Xkiller-Token': process.env.XKILLER_TOKEN ?? '' },
            },
          }
        : undefined,
  },
});
