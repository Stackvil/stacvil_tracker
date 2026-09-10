import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.ELECTRON === 'true' ? './' : '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5174,
    allowedHosts: true,
    proxy: {
      // Forward all /api requests to the local backend — same as Vercel does in production
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    }
  }
})
