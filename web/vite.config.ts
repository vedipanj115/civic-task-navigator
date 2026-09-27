import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Same-origin /v1 in dev, so no CORS; the API runs via `npm run dev:api` (api/.env PORT).
    proxy: { '/v1': 'http://localhost:3001' },
  },
})
