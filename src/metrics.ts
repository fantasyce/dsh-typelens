export type MetricOutcome = 'injected' | 'skipped' | 'timeout' | 'failure'

export interface MetricEvent {
  readonly outcome: MetricOutcome
  readonly durationMs: number
  readonly cacheHit: boolean
}

export interface MetricsSnapshot {
  readonly requests: number
  readonly injections: number
  readonly skips: number
  readonly timeouts: number
  readonly failures: number
  readonly cacheHits: number
  readonly totalDurationMs: number
}

export class MetricsStore {
  #value = { requests: 0, injections: 0, skips: 0, timeouts: 0, failures: 0, cacheHits: 0, totalDurationMs: 0 }

  record(event: MetricEvent): void {
    this.#value.requests += 1
    this.#value.totalDurationMs += Math.max(0, Math.round(event.durationMs))
    if (event.cacheHit) this.#value.cacheHits += 1
    if (event.outcome === 'injected') this.#value.injections += 1
    else if (event.outcome === 'skipped') this.#value.skips += 1
    else if (event.outcome === 'timeout') this.#value.timeouts += 1
    else this.#value.failures += 1
  }

  snapshot(): MetricsSnapshot { return Object.freeze({ ...this.#value }) }
  reset(): void { this.#value = { requests: 0, injections: 0, skips: 0, timeouts: 0, failures: 0, cacheHits: 0, totalDurationMs: 0 } }
}
