import { mkdtemp, mkdir, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { discoverProject } from '../src/project/discovery.js'

describe('discoverProject', () => {
  it('finds the nearest config without walking above the workspace', async () => {
    const root = await mkdtemp(join(tmpdir(), 'typelens-discovery-'))
    await mkdir(join(root, 'packages/app/src'), { recursive: true })
    await writeFile(join(root, 'tsconfig.json'), '{}')
    await writeFile(join(root, 'packages/app/tsconfig.json'), '{}')
    const canonicalRoot = await realpath(root)
    expect(await discoverProject(root, join(root, 'packages/app/src/a.ts'))).toEqual({
      configPath: join(canonicalRoot, 'packages/app/tsconfig.json'),
      projectRoot: join(canonicalRoot, 'packages/app'),
      implicit: false,
    })
  })

  it('returns an implicit project rooted at the workspace when no config exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'typelens-discovery-'))
    await writeFile(join(root, 'a.js'), '')
    expect(await discoverProject(root, join(root, 'a.js'))).toEqual({ configPath: undefined, projectRoot: await realpath(root), implicit: true })
  })
})
