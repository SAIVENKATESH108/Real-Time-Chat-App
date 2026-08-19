import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false, // Run test files in sequence to avoid remote database pool exhaustion
    sequence: {
      concurrent: false,
    },
  },
});
