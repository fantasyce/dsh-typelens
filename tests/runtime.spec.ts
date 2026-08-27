import { describe, expect, it } from 'vitest'
import { TypeLensRuntime } from '../src/runtime.js'

describe('TypeLensRuntime', () => {
  it('applies validated updates atomically and preserves the prior config on rejection', () => {
    const runtime = new TypeLensRuntime({ contextTokenBudget: 800 })
    expect(runtime.update({ contextTokenBudget: 1200 }).config.contextTokenBudget).toBe(1200)
    expect(() => runtime.update({ contextTokenBudget: 1 })).toThrow('contextTokenBudget')
    expect(runtime.snapshot().config.contextTokenBudget).toBe(1200)
  })

  it('reports source-free health and resets cache and metrics', () => {
    const runtime = new TypeLensRuntime()
    runtime.metrics.record({ outcome: 'failure', durationMs: 1, cacheHit: false })
    expect(runtime.snapshot().metrics.failures).toBe(1)
    runtime.reset()
    expect(runtime.snapshot().metrics.failures).toBe(0)
  })
})
