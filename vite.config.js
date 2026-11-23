import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { contentPlugin } from './scripts/vite-plugin-content.js'

// https://vite.dev/config/
// v5 (SPEC-v5-kart 2.2): `npm run build` runs two builds into dist/. The default build is the site
// (index.html, one entry). `--mode kart` then adds /kart/ (kart/index.html) without emptying dist/.
// Two builds share no chunks, so the kart page can never split or grow the site's bundle.
// The dev server serves both pages from this one config.
export default defineConfig(({ mode }) => {
  const kart = mode === 'kart'
  return {
    // "/" for the custom domain (https://aleick.com/) or a <user>.github.io site.
    // A project-site deploy sets BASE_PATH=/repo-name/ (see README "Deploy").
    base: process.env.BASE_PATH ?? '/',
    plugins: [react(), contentPlugin({ kartOnly: kart })],
    build: kart
      ? {
          emptyOutDir: false,
          rolldownOptions: { input: { kart: fileURLToPath(new URL('./kart/index.html', import.meta.url)) } },
        }
      : {},
    test: {
      include: ['src/**/*.test.{js,jsx}', 'scripts/**/*.test.js'],
      environment: 'node',
    },
  }
})
