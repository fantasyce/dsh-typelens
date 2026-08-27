import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { handleTypeLensApi } from '../src/host-api.js'
import { TypeLensRuntime } from '../src/runtime.js'

describe('TypeLens Host API', () => {
  it('reads health and atomically applies and persists a complete valid config', async () => {
    const root = await mkdtemp(join(tmpdir(), 'typelens-api-'))
    const path = join(root, 'settings.json')
    const runtime = new TypeLensRuntime()
    expect((await handleTypeLensApi(runtime, path, 'GET')).status).toBe(200)
    const config = { ...runtime.config, contextTokenBudget: 1200 }
    const response = await handleTypeLensApi(runtime, path, 'PUT', config)
    expect(response.status).toBe(200)
    expect(runtime.config.contextTokenBudget).toBe(1200)
    expect(JSON.parse(await readFile(path, 'utf8')).contextTokenBudget).toBe(1200)
  })

  it('rejects invalid updates without changing or persisting them', async () => {
    const root = await mkdtemp(join(tmpdir(), 'typelens-api-'))
    const path = join(root, 'settings.json')
    const runtime = new TypeLensRuntime()
    const response = await handleTypeLensApi(runtime, path, 'PUT', { ...runtime.config, contextTokenBudget: 1 })
    expect(response.status).toBe(400)
    expect(runtime.config.contextTokenBudget).toBe(800)
    await expect(readFile(path, 'utf8')).rejects.toThrow()
  })

  it('resets cache and metrics through POST', async () => {
    const runtime = new TypeLensRuntime()
    runtime.metrics.record({ outcome: 'failure', durationMs: 1, cacheHit: false })
    const response = await handleTypeLensApi(runtime, '/unused', 'POST')
    expect(response.status).toBe(200)
    expect(runtime.metrics.snapshot().failures).toBe(0)
  })
})
