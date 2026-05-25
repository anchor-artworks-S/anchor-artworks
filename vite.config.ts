import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

process.env.ROLLUP_SKIP_NODEJS_NATIVE_BUILD = 'true';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        external: [
          /^@rollup\/rollup-win32-/,
          /^@rollup\/rollup-darwin-/,
          /^@rollup\/rollup-linux-/,
          /^@rollup\/rollup-android-/,
          /^@rollup\/rollup-freebsd-/,
        ],
      },
    },
  };
});
