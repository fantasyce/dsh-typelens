import { describe, expect, it, vi } from 'vitest'
import { normalizeConfig } from '../src/config.js'
import { CircuitBreaker } from '../src/availability/circuit-breaker.js'
import { MetricsStore } from '../src/metrics.js'
import { registerTypeLensTools } from '../src/tools.js'

describe('explicit TypeLens tools', () => {
  it('registers the complete stable tool set', () => {
    const definitions: Array<{ name: string }> = []
    const ctx = { tools: { register: (definition: { name: string }) => { definitions.push(definition); return () => {} } } }
    registerTypeLensTools(ctx as never, {} as never, normalizeConfig(undefined), new CircuitBreaker(), new MetricsStore())
    expect(definitions.map(item => item.name)).toEqual([
      'typelens_lookup_type', 'typelens_list_types', 'typelens_check', 'typelens_explain',
    ])
  })

  it('executes check against the caller workspace and renders bounded text', async () => {
    const definitions: Array<{ name: string; execute: (args: unknown, exec: unknown) => Promise<unknown> }> = []
    const ctx = { tools: { register: (definition: never) => { definitions.push(definition); return () => {} } } }
    const manager = { analyzeDiagnostics: vi.fn().mockResolvedValue({ diagnostics: [], omitted: 0, durationMs: 1, file: 'a.ts', kind: 'diagnostics' }) }
    registerTypeLensTools(ctx as never, manager as never, normalizeConfig(undefined), new CircuitBreaker(), new MetricsStore())
    const tool = definitions.find(item => item.name === 'typelens_check')!
    const result = await tool.execute({ file_path: 'a.ts' }, { signal: new AbortController().signal, agent: { session: { header: { cwd: '/repo', id: 's' } } } })
    expect(result).toEqual({ text: '<typelens_diagnostics status="clean" duration_ms="1" />' })
    expect(manager.analyzeDiagnostics).toHaveBeenCalledWith(expect.objectContaining({ workspace: '/repo', file: 'a.ts', sessionId: expect.stringMatching(/^s:explicit:/u) }), expect.any(AbortSignal))
  })

  it('requires an agent workspace for file tools', async () => {
    const definitions: Array<{ name: string; execute: (args: unknown, exec: unknown) => Promise<unknown> }> = []
    const ctx = { tools: { register: (definition: never) => { definitions.push(definition); return () => {} } } }
    registerTypeLensTools(ctx as never, {} as never, normalizeConfig(undefined), new CircuitBreaker(), new MetricsStore())
    await expect(definitions[0]!.execute({ file_path: 'a.ts', name: 'A' }, { signal: new AbortController().signal })).rejects.toThrow('workspace')
  })
})
