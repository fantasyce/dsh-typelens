import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    dts: true,
    clean: true,
    sourcemap: false,
    external: [/^@deepseek-ai\//],
  },
  {
    entry: { client: 'src/client/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: false,
    external: [/^@deepseek-ai\//, /^react/],
  },
])
