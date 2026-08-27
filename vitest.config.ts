import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/types.ts', 'src/**/*.d.ts'],
      thresholds: { lines: 85, functions: 75, branches: 80, statements: 85 },
    },
  },
})
