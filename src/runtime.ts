import { normalizeConfig, type TypeLensConfig } from './config.js'
import { ProjectManager } from './project/manager.js'
import { CircuitBreaker } from './availability/circuit-breaker.js'
import { MetricsStore, type MetricsSnapshot } from './metrics.js'

export interface RuntimeSnapshot {
  readonly product: 'DSH TypeLens'
  readonly version: '0.1.0'
  readonly targetDsh: '0.1.1-rc.2'
  readonly analysisLocal: true
  readonly externalNetworkRequests: false
  readonly config: TypeLensConfig
  readonly circuit: ReturnType<CircuitBreaker['snapshot']>
  readonly metrics: MetricsSnapshot
}

export class TypeLensRuntime {
  #config: TypeLensConfig
  #manager: ProjectManager
  readonly breaker = new CircuitBreaker()
  readonly metrics = new MetricsStore()

  constructor(input?: unknown) {
    this.#config = normalizeConfig(input)
    this.#manager = new ProjectManager(this.#config)
  }

  get config(): TypeLensConfig { return this.#config }
  get manager(): ProjectManager { return this.#manager }

  update(input: unknown): RuntimeSnapshot {
    const next = normalizeConfig(input)
    const nextManager = new ProjectManager(next)
    const previous = this.#manager
    this.#config = next
    this.#manager = nextManager
    previous.clear()
    return this.snapshot()
  }

  reset(): void {
    this.#manager.clear()
    this.metrics.reset()
    this.breaker.reset()
  }

  dispose(): void { this.#manager.clear() }

  snapshot(): RuntimeSnapshot {
    return Object.freeze({
      product: 'DSH TypeLens', version: '0.1.0', targetDsh: '0.1.1-rc.2', analysisLocal: true, externalNetworkRequests: false,
      config: this.#config, circuit: this.breaker.snapshot(), metrics: this.metrics.snapshot(),
    })
  }
}
