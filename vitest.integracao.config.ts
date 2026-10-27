import { defineConfig } from 'vitest/config';

process.env.DOTENV_CONFIG_PATH = '.env.test';

export default defineConfig({
  test: {
    include: ['tests/integracao/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20000,
    setupFiles: ['dotenv/config'],
  },
});
