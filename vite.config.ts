import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['recharts'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
    middlewareMode: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'recharts': ['recharts'],
          'ui': ['lucide-react'],
        },
      },
    },
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false,
  },
})
