import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  root: 'frontend',
  publicDir: '../public', // Point to the public directory for static assets
  build: {
    outDir: '../public/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'frontend/index.html'
      }
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow external connections
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  define: {
    // Enable HMR for better development experience
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production')
  }
});
