import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { contentPlugin } from './scripts/vite-plugin-content.js'

// https://vite.dev/config/
export default defineConfig({
  // "/" for https://andrew-leick.github.io/ or a custom domain.
  // A project-site deploy sets BASE_PATH=/repo-name/ (see README "Deploy").
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), contentPlugin()],
  build: {
    // v5: the kart minigame is a second HTML entry with its own bundle (SPEC-v5-kart 2.2).
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        kart: fileURLToPath(new URL('./kart/index.html', import.meta.url)),
      },
    },
  },
  test: {
    include: ['src/**/*.test.js', 'scripts/**/*.test.js'],
    environment: 'node',
  },
})
