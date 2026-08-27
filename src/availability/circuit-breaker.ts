export interface CircuitBreakerOptions {
  readonly threshold?: number
  readonly windowMs?: number
  readonly pauseMs?: number
  readonly now?: () => number
}

export class CircuitBreaker {
  readonly #threshold: number
  readonly #windowMs: number
  readonly #pauseMs: number
  readonly #now: () => number
  #failures: number[] = []
  #pausedUntil = 0

  constructor(options: CircuitBreakerOptions = {}) {
    this.#threshold = options.threshold ?? 5
    this.#windowMs = options.windowMs ?? 60_000
    this.#pauseMs = options.pauseMs ?? 30_000
    this.#now = options.now ?? Date.now
  }

  allowAutomatic(): boolean { return this.#now() >= this.#pausedUntil }
  allowExplicit(): boolean { return true }

  recordFailure(): void {
    const now = this.#now()
    this.#failures = this.#failures.filter(value => now - value <= this.#windowMs)
    this.#failures.push(now)
    if (this.#failures.length >= this.#threshold) this.#pausedUntil = now + this.#pauseMs
  }

  recordSuccess(): void { this.#failures = [] }

  snapshot(): { readonly paused: boolean; readonly failuresInWindow: number; readonly pausedUntil: number } {
    return Object.freeze({ paused: !this.allowAutomatic(), failuresInWindow: this.#failures.length, pausedUntil: this.#pausedUntil })
  }
}
