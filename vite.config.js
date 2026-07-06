import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_DEPLOY_PLATFORM === 'vercel' ? '/' : '/DocAI-app',
  build: {
    chunkSizeWarningLimit: 1000,
  },
})