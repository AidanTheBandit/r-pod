import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3450,
    host: true,
  },
  preview: {
    port: 3450,
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'r-pod.boondit.site',
      'boondit.site',
      '*.boondit.site'
    ],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'esbuild',
  },
})
