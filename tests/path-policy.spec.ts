import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeConfig } from '../src/config.js'
import { resolveWorkspaceFile } from '../src/path-policy.js'

describe('resolveWorkspaceFile', () => {
  it('allows source files and rejects default excludes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'typelens-path-'))
    await mkdir(join(root, 'src'))
    await mkdir(join(root, 'node_modules'))
    await writeFile(join(root, 'src/a.ts'), 'export type A = string')
    await writeFile(join(root, 'node_modules/a.ts'), '')
    expect((await resolveWorkspaceFile(root, 'src/a.ts', normalizeConfig(undefined))).relativePath).toBe('src/a.ts')
    await expect(resolveWorkspaceFile(root, 'node_modules/a.ts', normalizeConfig(undefined))).rejects.toThrow('excluded-path')
  })

  it('rejects traversal and a symlink escaping the workspace', async () => {
    const root = await mkdtemp(join(tmpdir(), 'typelens-path-'))
    const outside = await mkdtemp(join(tmpdir(), 'typelens-outside-'))
    await writeFile(join(outside, 'secret.ts'), 'secret')
    await symlink(join(outside, 'secret.ts'), join(root, 'escape.ts'))
    await expect(resolveWorkspaceFile(root, '../outside.ts', normalizeConfig(undefined))).rejects.toThrow('outside-workspace')
    await expect(resolveWorkspaceFile(root, 'escape.ts', normalizeConfig(undefined))).rejects.toThrow('outside-workspace')
  })

  it('supports a non-existing write target through its real parent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'typelens-path-'))
    await mkdir(join(root, 'src'))
    const resolved = await resolveWorkspaceFile(root, 'src/new.ts', normalizeConfig(undefined), { mayNotExist: true })
    expect(resolved.relativePath).toBe('src/new.ts')
  })
})
