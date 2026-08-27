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
})
