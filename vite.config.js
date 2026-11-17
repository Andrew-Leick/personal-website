import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { contentPlugin } from './scripts/vite-plugin-content.js'

// https://vite.dev/config/
export default defineConfig({
  // "/" for https://andrew-leick.github.io/ or a custom domain.
  // A project-site deploy sets BASE_PATH=/repo-name/ (see README "Deploy").
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), contentPlugin()],
  test: {
    include: ['src/**/*.test.{js,jsx}', 'scripts/**/*.test.js'],
    environment: 'node',
  },
})
