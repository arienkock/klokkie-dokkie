import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: process.env.VITE_BASE_URL ?? '/',
  resolve: {
    alias: {
      '/shoelace': resolve('./node_modules/@shoelace-style/shoelace'),
    },
  },
  test: {
    environment: 'happy-dom',
  },
});
