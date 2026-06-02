import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

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
      // 初回表示高速化: 重いライブラリを別 chunk に分離して並列ダウンロード可能に
      rollupOptions: {
        output: {
          manualChunks: {
            // React + ReactDOM (基幹、必ず必要)
            'react-vendor': ['react', 'react-dom'],
            // アニメーション系 (Framer Motion: 大)
            'motion-vendor': ['motion', 'motion/react'],
            // CSV パーサ (Vimeoシート読込で使用)
            'papa-vendor': ['papaparse'],
            // Vercel analytics (軽量)
            'analytics-vendor': ['@vercel/analytics', '@vercel/analytics/react'],
          },
        },
      },
      // 1ファイルあたりの上限を上げる(警告抑制)
      chunkSizeWarningLimit: 1000,
    },
  };
});
