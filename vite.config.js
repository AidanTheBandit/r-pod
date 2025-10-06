import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3450,
    host: true,
    allowedHosts: true, // Allow all hosts
  },
  preview: {
    port: 3450,
    host: true,
    allowedHosts: true, // Allow all hosts
    https: false, // Let the reverse proxy handle HTTPS
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'esbuild',
  },
})
