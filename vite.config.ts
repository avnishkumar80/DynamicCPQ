import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY)
    },
    css: {
      postcss: {
        plugins: [
          tailwindcss(),
        ],
      },
    },
    server: {
      port: 7865,
      host: '0.0.0.0', // Bind to all interfaces (required for container/spaces)
      allowedHosts: ['avnishkumar80-llmdrivencpq.hf.space'],
      watch: {
        usePolling: true
      },
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      }
    }
  };
});