import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          socket: ['socket.io-client'],
          ui: ['react-toastify', 'emoji-picker-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: true, // Listen on all addresses
  }
})