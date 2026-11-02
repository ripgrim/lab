import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { labApi } from './vite/lab-api.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), labApi(import.meta.dirname)],
  resolve: { alias: { '@': resolve(import.meta.dirname, 'src') } },
  server: { port: 5420 },
  build: {
    rollupOptions: {
      input: { lab: resolve(import.meta.dirname, 'index.html'), film: resolve(import.meta.dirname, 'film.html') },
    },
  },
})
