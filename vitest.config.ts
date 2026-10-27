import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    environment: 'node',
    setupFiles: ['@testing-library/jest-dom/vitest'],
  },
});
