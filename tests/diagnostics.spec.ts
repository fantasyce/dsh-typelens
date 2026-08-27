import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeConfig } from '../src/config.js'
import { ProjectManager } from '../src/project/manager.js'

describe('diagnostic analysis', () => {
  it('orders changed-file errors first and marks repeated diagnostics as existing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'typelens-diag-'))
    await writeFile(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true }, include: ['*.ts'] }))
    await writeFile(join(root, 'other.ts'), 'const count: number = "bad"')
    const file = join(root, 'main.ts')
    await writeFile(file, 'const enabled: boolean = "bad"')
    const manager = new ProjectManager(normalizeConfig(undefined))
    const first = await manager.analyzeDiagnostics({ workspace: root, file, sessionId: 's' }, new AbortController().signal)
    const second = await manager.analyzeDiagnostics({ workspace: root, file, sessionId: 's' }, new AbortController().signal)
    expect(first.diagnostics[0]?.file).toBe('main.ts')
    expect(first.diagnostics.every(item => item.isNew)).toBe(true)
    expect(second.diagnostics.every(item => !item.isNew)).toBe(true)
  })

  it('bounds reported diagnostics and accounts for omissions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'typelens-diag-'))
    const file = join(root, 'main.ts')
    await writeFile(file, Array.from({ length: 10 }, (_, index) => `const n${index}: number = "bad"`).join('\n'))
    const manager = new ProjectManager(normalizeConfig({ maxDiagnostics: 3 }))
    const result = await manager.analyzeDiagnostics({ workspace: root, file, sessionId: 's' }, new AbortController().signal)
    expect(result.diagnostics).toHaveLength(3)
    expect(result.omitted).toBeGreaterThan(0)
  })
})
