import { describe, expect, it, vi } from 'vitest'
import { normalizeConfig } from '../src/config.js'
import { CircuitBreaker } from '../src/availability/circuit-breaker.js'
import { MetricsStore } from '../src/metrics.js'
import { createPostExecuteHandler } from '../src/dsh/hooks.js'

function exec(name: string, args: Record<string, unknown>) {
  return { name, arguments: args, signal: new AbortController().signal, agent: { session: { header: { id: 's', cwd: '/workspace' } } } } as never
}

describe('post-execute hook', () => {
  it('adds type context after a successful read', async () => {
    const manager = { analyzeContext: vi.fn().mockResolvedValue({ file: 'a.ts', text: '<typelens_context>type A = string</typelens_context>', declarations: 1, estimatedTokens: 12, durationMs: 2, cacheHit: false, truncated: false }), analyzeDiagnostics: vi.fn(), clear: vi.fn() }
    const handler = createPostExecuteHandler(manager as never, normalizeConfig(undefined), new CircuitBreaker(), new MetricsStore())
    const decision = await handler(exec('read', { file_path: 'a.ts' }), { isError: false } as never, async () => ({ kind: 'accept' }))
    expect(decision.kind).toBe('accept')
    expect(decision.additionalContexts).toHaveLength(1)
    expect(manager.analyzeContext).toHaveBeenCalledWith(expect.objectContaining({ workspace: '/workspace', file: 'a.ts' }), expect.any(AbortSignal))
  })

  it('adds diagnostics after an edit and fails open on internal errors', async () => {
    const manager = { analyzeContext: vi.fn(), analyzeDiagnostics: vi.fn().mockRejectedValue(new Error('broken')), clear: vi.fn() }
    const metrics = new MetricsStore()
    const handler = createPostExecuteHandler(manager as never, normalizeConfig(undefined), new CircuitBreaker(), metrics)
    const downstream = { kind: 'accept' as const }
    expect(await handler(exec('edit', { file_path: 'a.ts' }), { isError: false } as never, async () => downstream)).toBe(downstream)
    expect(metrics.snapshot().failures).toBe(1)
  })

  it('passes failed and unrelated tool results downstream unchanged', async () => {
    const manager = { analyzeContext: vi.fn(), analyzeDiagnostics: vi.fn(), clear: vi.fn() }
    const handler = createPostExecuteHandler(manager as never, normalizeConfig(undefined), new CircuitBreaker(), new MetricsStore())
    const downstream = { kind: 'accept' as const }
    expect(await handler(exec('read', { file_path: 'a.ts' }), { isError: true } as never, async () => downstream)).toBe(downstream)
    expect(await handler(exec('bash', { command: 'pwd' }), { isError: false } as never, async () => downstream)).toBe(downstream)
    expect(manager.analyzeContext).not.toHaveBeenCalled()
  })

  it('aborts slow automatic analysis at the configured deadline and fails open', async () => {
    const manager = {
      analyzeContext: vi.fn().mockImplementation(async (_request, signal: AbortSignal) => {
        await new Promise(resolve => setTimeout(resolve, 140))
        if (!signal.aborted) throw new Error('deadline signal was not aborted')
        signal.throwIfAborted()
      }),
      analyzeDiagnostics: vi.fn(), clear: vi.fn(),
    }
    const metrics = new MetricsStore()
    const handler = createPostExecuteHandler(manager as never, normalizeConfig({ automaticTimeoutMs: 100 }), new CircuitBreaker(), metrics)
    const downstream = { kind: 'accept' as const }
    expect(await handler(exec('read', { file_path: 'a.ts' }), { isError: false } as never, async () => downstream)).toBe(downstream)
    expect(metrics.snapshot().timeouts).toBe(1)
  })
})
