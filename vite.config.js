import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const catalystTarget = env.VITE_CATALYST_API_BASE_URL || 'https://spikra-ai-proposal-698386704.development.catalystserverless.com';

  return {
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'next/image': path.resolve(__dirname, './src/lib/next-image.tsx')
      }
    },
    base: './',
    build: {
      outDir: 'dist',
      emptyOutDir: true
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/spikra': {
          target: catalystTarget,
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});
