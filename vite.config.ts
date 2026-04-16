import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      watch: {
        usePolling: true,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('--- ERROR: Proxy Error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('--- RUN: API Request:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
                console.log(`--- ERROR: FAIL: API Error Status: ${proxyRes.statusCode} URL: ${req.url}`);
              } else {
                console.log(`--- GOOD: API Response: ${proxyRes.statusCode} URL: ${req.url}`);
              }
            });
          },
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
