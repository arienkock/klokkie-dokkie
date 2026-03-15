import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '/shoelace': resolve('./node_modules/@shoelace-style/shoelace'),
    },
  },
  test: {
    environment: 'happy-dom',
  },
});
