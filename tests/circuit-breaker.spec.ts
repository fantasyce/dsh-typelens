import { describe, expect, it } from 'vitest'
import { CircuitBreaker } from '../src/availability/circuit-breaker.js'

describe('CircuitBreaker', () => {
  it('pauses after five failures in sixty seconds and recovers after thirty seconds', () => {
    let now = 0
    const breaker = new CircuitBreaker({ threshold: 5, windowMs: 60_000, pauseMs: 30_000, now: () => now })
    for (let i = 0; i < 4; i += 1) { breaker.recordFailure(); expect(breaker.allowAutomatic()).toBe(true) }
    breaker.recordFailure()
    expect(breaker.allowAutomatic()).toBe(false)
    expect(breaker.allowExplicit()).toBe(true)
    now = 30_001
    expect(breaker.allowAutomatic()).toBe(true)
  })

  it('success clears the rolling failure history', () => {
    const breaker = new CircuitBreaker()
    for (let i = 0; i < 4; i += 1) breaker.recordFailure()
    breaker.recordSuccess()
    breaker.recordFailure()
    expect(breaker.allowAutomatic()).toBe(true)
  })
})
