import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.js'],
    environmentMatchGlobs: [['app/**/*.test.js', 'jsdom']],
    reporters: 'default',
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
