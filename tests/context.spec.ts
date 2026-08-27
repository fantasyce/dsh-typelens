import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeConfig } from '../src/config.js'
import { ProjectManager } from '../src/project/manager.js'

async function fixture(): Promise<{ root: string; file: string }> {
  const root = await mkdtemp(join(tmpdir(), 'typelens-context-'))
  await mkdir(join(root, 'src'))
  await writeFile(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true }, include: ['src'] }))
  await writeFile(join(root, 'src/types.ts'), [
    'export type Role = "admin" | "user"',
    'export interface User { id: string; role: Role }',
    'export interface Unrelated { hidden: boolean }',
  ].join('\n'))
  const file = join(root, 'src/main.ts')
  await writeFile(file, [
    'import type { User, Unrelated } from "./types"',
    'export function label(user: User): string {',
    '  return user.id',
    '}',
    'const neverUsed: Unrelated = { hidden: true }',
  ].join('\n'))
  return { root, file }
}

describe('ProjectManager context analysis', () => {
  it('injects complete imported types used by a partial read and excludes unrelated declarations', async () => {
    const { root, file } = await fixture()
    const manager = new ProjectManager(normalizeConfig(undefined))
    const result = await manager.analyzeContext({ workspace: root, file, range: { startLine: 2, endLine: 4 } }, new AbortController().signal)
    expect(result.text).toContain('interface User')
    expect(result.text).toContain('type Role')
    expect(result.text).not.toContain('Unrelated')
    expect(result.truncated).toBe(false)
  })

  it('includes only complete declarations that fit the token budget', async () => {
    const { root, file } = await fixture()
    const manager = new ProjectManager(normalizeConfig({ contextTokenBudget: 32 }))
    const result = await manager.analyzeContext({ workspace: root, file, range: { startLine: 2, endLine: 4 } }, new AbortController().signal)
    expect(result.estimatedTokens).toBeLessThanOrEqual(32)
    expect(result.text.endsWith('\n')).toBe(true)
    expect(result.truncated).toBe(true)
  })

  it('honors cancellation before reading source', async () => {
    const { root, file } = await fixture()
    const controller = new AbortController()
    controller.abort(new Error('stop'))
    const manager = new ProjectManager(normalizeConfig(undefined))
    await expect(manager.analyzeContext({ workspace: root, file }, controller.signal)).rejects.toThrow('stop')
  })

  it('analyzes type references inside Vue single-file component script blocks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'typelens-vue-'))
    await writeFile(join(root, 'types.ts'), 'export interface User { id: string; displayName: string }\n')
    await writeFile(join(root, 'Widget.vue'), '<template><p>x</p></template>\n<script setup lang="ts">\nimport type { User } from "./types"\nconst user: User = { id: "1", displayName: "Ada" }\n</script>\n')
    const manager = new ProjectManager(normalizeConfig({}))
    const result = await manager.analyzeContext({ workspace: root, file: 'Widget.vue', range: { startLine: 3, endLine: 4 } }, new AbortController().signal)
    expect(result.text).toContain('interface User')
    expect(result.file).toBe('Widget.vue')
  })

  it('reuses bounded in-memory context and invalidates it when an imported source changes', async () => {
    const { root, file } = await fixture()
    const manager = new ProjectManager(normalizeConfig({}))
    const request = { workspace: root, file, range: { startLine: 2, endLine: 4 } }
    expect((await manager.analyzeContext(request, new AbortController().signal)).cacheHit).toBe(false)
    expect((await manager.analyzeContext(request, new AbortController().signal)).cacheHit).toBe(true)
    await writeFile(join(root, 'src/types.ts'), 'export interface User { id: string; changed: boolean }\n')
    const changed = await manager.analyzeContext(request, new AbortController().signal)
    expect(changed.cacheHit).toBe(false)
    expect(changed.text).toContain('changed')
  })
})
