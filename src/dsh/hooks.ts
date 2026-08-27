import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { PostToolDecision, ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import type { TypeLensConfig } from '../config.js'
import type { CircuitBreaker } from '../availability/circuit-breaker.js'
import type { MetricsStore } from '../metrics.js'
import type { ProjectManager } from '../project/manager.js'
import { formatDiagnostics } from './format.js'
import { recognizeFileOperation } from './tool-recognition.js'

export type PostExecuteHandler = (
  exec: ToolExecution,
  result: Readonly<ToolExecutionResult>,
  next: () => Promise<PostToolDecision>,
) => Promise<PostToolDecision>

function pluginContext(text: string) {
  return createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'plugin', plugin: 'dsh-typelens' } })
}

export function createPostExecuteHandler(
  manager: ProjectManager,
  config: TypeLensConfig,
  breaker: CircuitBreaker,
  metrics: MetricsStore,
): PostExecuteHandler {
  return async (exec, result, next) => {
    if (result.isError) return next()
    const operation = recognizeFileOperation(exec.name, exec.arguments)
    const workspace = exec.agent?.session.header.cwd
    if (!operation || !workspace) return next()
    if (!breaker.allowAutomatic()) {
      metrics.record({ outcome: 'skipped', durationMs: 0, cacheHit: false })
      return next()
    }
    const downstream = await next()
    if (downstream.kind !== 'accept') return downstream
    try {
      if (operation.kind === 'read' && config.automaticContext) {
        const analysis = await manager.analyzeContext({ workspace, file: operation.file, ...(operation.range ? { range: operation.range } : {}) }, exec.signal)
        if (!analysis.text) {
          metrics.record({ outcome: 'skipped', durationMs: analysis.durationMs, cacheHit: analysis.cacheHit })
          breaker.recordSuccess()
          return downstream
        }
        metrics.record({ outcome: 'injected', durationMs: analysis.durationMs, cacheHit: analysis.cacheHit })
        breaker.recordSuccess()
        return { ...downstream, additionalContexts: [...downstream.additionalContexts ?? [], pluginContext(analysis.text)] }
      }
      if (operation.kind === 'write' && config.automaticDiagnostics) {
        const analysis = await manager.analyzeDiagnostics({
          workspace, file: operation.file, sessionId: String(exec.agent?.session.header.id ?? 'unknown'),
        }, exec.signal)
        metrics.record({ outcome: 'injected', durationMs: analysis.durationMs, cacheHit: false })
        breaker.recordSuccess()
        return { ...downstream, additionalContexts: [...downstream.additionalContexts ?? [], pluginContext(formatDiagnostics(analysis))] }
      }
      metrics.record({ outcome: 'skipped', durationMs: 0, cacheHit: false })
      return downstream
    } catch (error) {
      breaker.recordFailure()
      const timedOut = error instanceof Error && /timeout|timed out/iu.test(error.message)
      metrics.record({ outcome: timedOut ? 'timeout' : 'failure', durationMs: 0, cacheHit: false })
      return downstream
    }
  }
}
