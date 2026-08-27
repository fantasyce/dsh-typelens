import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { PostToolDecision, ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import type { TypeLensConfig } from '../config.js'
import type { CircuitBreaker } from '../availability/circuit-breaker.js'
import type { MetricsStore } from '../metrics.js'
import type { ProjectManager } from '../project/manager.js'
import type { TypeLensRuntime } from '../runtime.js'
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

function contextDelivery(analysis: Awaited<ReturnType<ProjectManager['analyzeContext']>>): string {
  const file = analysis.file.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
  return `<typelens_delivery file="${file}" declarations="${analysis.declarations}" estimated_tokens="${analysis.estimatedTokens}" duration_ms="${analysis.durationMs}" cache_hit="${analysis.cacheHit}" truncated="${analysis.truncated}">\n${analysis.text}</typelens_delivery>`
}

export function createPostExecuteHandler(
  runtimeOrManager: TypeLensRuntime | ProjectManager,
  legacyConfig?: TypeLensConfig,
  legacyBreaker?: CircuitBreaker,
  legacyMetrics?: MetricsStore,
): PostExecuteHandler {
  const access = legacyConfig === undefined
    ? runtimeOrManager as TypeLensRuntime
    : {
        get manager() { return runtimeOrManager as ProjectManager },
        get config() { return legacyConfig },
        breaker: legacyBreaker!,
        metrics: legacyMetrics!,
      }
  return async (exec, result, next) => {
    if (result.isError) return next()
    const operation = recognizeFileOperation(exec.name, exec.arguments)
    const workspace = exec.agent?.session.header.cwd
    if (!operation || !workspace) return next()
    if (!access.breaker.allowAutomatic()) {
      access.metrics.record({ outcome: 'skipped', durationMs: 0, cacheHit: false })
      return next()
    }
    const downstream = await next()
    if (downstream.kind !== 'accept') return downstream
    if (downstream.additionalContexts?.some(context => context.source?.kind === 'plugin' && context.source.plugin === 'dsh-typelens')) return downstream
    try {
      const analysisSignal = AbortSignal.any([exec.signal, AbortSignal.timeout(access.config.automaticTimeoutMs)])
      if (operation.kind === 'read' && access.config.automaticContext) {
        const analysis = await access.manager.analyzeContext({ workspace, file: operation.file, ...(operation.range ? { range: operation.range } : {}) }, analysisSignal)
        if (!analysis.text) {
          access.metrics.record({ outcome: 'skipped', durationMs: analysis.durationMs, cacheHit: analysis.cacheHit })
          access.breaker.recordSuccess()
          return downstream
        }
        access.metrics.record({ outcome: 'injected', durationMs: analysis.durationMs, cacheHit: analysis.cacheHit })
        access.breaker.recordSuccess()
        return { ...downstream, additionalContexts: [...downstream.additionalContexts ?? [], pluginContext(contextDelivery(analysis))] }
      }
      if (operation.kind === 'write' && access.config.automaticDiagnostics) {
        const analysis = await access.manager.analyzeDiagnostics({
          workspace, file: operation.file, sessionId: String(exec.agent?.session.header.id ?? 'unknown'),
        }, analysisSignal)
        access.metrics.record({ outcome: 'injected', durationMs: analysis.durationMs, cacheHit: false })
        access.breaker.recordSuccess()
        return { ...downstream, additionalContexts: [...downstream.additionalContexts ?? [], pluginContext(formatDiagnostics(analysis))] }
      }
      access.metrics.record({ outcome: 'skipped', durationMs: 0, cacheHit: false })
      return downstream
    } catch (error) {
      access.breaker.recordFailure()
      const timedOut = error instanceof Error && /timeout|timed out/iu.test(error.message)
      access.metrics.record({ outcome: timedOut ? 'timeout' : 'failure', durationMs: 0, cacheHit: false })
      return downstream
    }
  }
}
