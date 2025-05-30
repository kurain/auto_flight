import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@entities': resolve(__dirname, './src/entities'),
      '@effects': resolve(__dirname, './src/effects'),
      '@physics': resolve(__dirname, './src/physics'),
      '@camera': resolve(__dirname, './src/camera'),
      '@ui': resolve(__dirname, './src/ui'),
      '@rendering': resolve(__dirname, './src/rendering'),
      '@utils': resolve(__dirname, './src/utils'),
    },
  },
  build: {
    target: 'es2022',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});