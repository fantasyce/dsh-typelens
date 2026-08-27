import { describe, expect, it } from 'vitest'
import { adaptSource } from '../src/adapters/index.js'

describe('adaptSource', () => {
  it.each(['a.ts', 'a.tsx', 'a.js', 'a.jsx'])('passes through %s with stable offsets', async (fileName) => {
    const result = await adaptSource(fileName, 'const x: string = "x"')
    expect(result).toMatchObject({ kind: 'plain', language: fileName.slice(fileName.lastIndexOf('.') + 1), sourceOffset: 0 })
    expect(result?.text).toBe('const x: string = "x"')
  })

  it('extracts Svelte and Vue script blocks and preserves the source offset', async () => {
    const svelte = await adaptSource('Widget.svelte', '<h1>x</h1>\n<script lang="ts">\nexport let name: string\n</script>')
    const vue = await adaptSource('Widget.vue', '<template>x</template>\n<script setup lang="ts">\nconst n: number = 1\n</script>')
    expect(svelte?.kind).toBe('svelte')
    expect(svelte?.text).toContain('export let name')
    expect(svelte?.sourceOffset).toBeGreaterThan(0)
    expect(vue?.kind).toBe('vue')
    expect(vue?.text).toContain('const n')
    expect(vue?.sourceOffset).toBeGreaterThan(0)
  })

  it('returns undefined for unsupported files', async () => {
    expect(await adaptSource('README.md', '# no')).toBeUndefined()
  })
})
