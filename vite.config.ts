import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { resolve } from 'path';

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'frontend/src')
    }
  },
  root: 'frontend',
  publicDir: '../public',
  build: {
    outDir: '../public/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'frontend/index.html')
      }
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 5173,
    host: '0.0.0.0'
  }
});
