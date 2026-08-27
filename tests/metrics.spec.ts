import { describe, expect, it } from 'vitest'
import { MetricsStore } from '../src/metrics.js'

describe('MetricsStore', () => {
  it('stores aggregate counts and durations without source-bearing fields', () => {
    const metrics = new MetricsStore()
    metrics.record({ outcome: 'injected', durationMs: 12, cacheHit: true })
    metrics.record({ outcome: 'timeout', durationMs: 8, cacheHit: false })
    expect(metrics.snapshot()).toEqual({ requests: 2, injections: 1, skips: 0, timeouts: 1, failures: 0, cacheHits: 1, totalDurationMs: 20 })
    expect(JSON.stringify(metrics.snapshot())).not.toContain('file')
  })
})
