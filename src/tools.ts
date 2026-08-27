import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type ToolExecution } from '@deepseek-ai/dsh-tools'
import type { TypeLensConfig } from './config.js'
import type { CircuitBreaker } from './availability/circuit-breaker.js'
import type { MetricsStore } from './metrics.js'
import type { ProjectManager } from './project/manager.js'
import { formatDiagnostics } from './dsh/format.js'
import type { TypeLensRuntime } from './runtime.js'

const TEXT_OUTPUT = {
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: { text: { type: 'string', required: true } },
  },
  render: (_args: unknown, value: { text: string }) => [{ type: 'text' as const, text: value.text }],
} as const

function workspaceOf(exec: Pick<ToolExecution, 'agent'>): { workspace: string; sessionId: string } {
  const workspace = exec.agent?.session.header.cwd
  if (!workspace) throw new Error('TypeLens file tools require an agent session workspace')
  return { workspace, sessionId: String(exec.agent?.session.header.id ?? 'unknown') }
}

function renderInspected(rows: Awaited<ReturnType<ProjectManager['inspect']>>): string {
  if (rows.length === 0) return 'No matching declarations were found in the bounded workspace project.'
  return rows.map(row => [
    `${row.kind} ${row.name} — ${row.file}:${row.line}`,
    row.declaration,
    row.usages.length > 0 ? `Usages (${row.usages.length}): ${row.usages.map(usage => `${usage.file}:${usage.line}:${usage.character}`).join(', ')}` : 'Usages: none found',
  ].join('\n')).join('\n\n')
}

export function registerTypeLensTools(
  ctx: Context,
  runtimeOrManager: TypeLensRuntime | ProjectManager,
  legacyConfig?: TypeLensConfig,
  legacyBreaker?: CircuitBreaker,
  legacyMetrics?: MetricsStore,
): void {
  const access = legacyConfig === undefined
    ? runtimeOrManager as TypeLensRuntime
    : {
        get manager() { return runtimeOrManager as ProjectManager },
        get config() { return legacyConfig },
        breaker: legacyBreaker!, metrics: legacyMetrics!,
        snapshot: () => ({ product: 'DSH TypeLens', version: '0.1.1', targetDsh: '0.1.1-rc.2', analysisLocal: true, externalNetworkRequests: false, config: legacyConfig, circuit: legacyBreaker!.snapshot(), metrics: legacyMetrics!.snapshot() }),
      }
  const config = access.config
  ctx.tools.register(defineTool({
    name: 'typelens_lookup_type',
    description: 'Find type declarations relevant to a named symbol using local analysis. Returned context follows the active DSH model-provider path.',
    parameters: {
      file_path: { type: 'string', description: 'Optional source file relative to the session workspace. Omit to search the configured project.' },
      name: { type: 'string', required: true, description: 'Type, interface, class, function, or symbol name.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.explicitTimeoutMs,
    async execute(args, exec) {
      const { workspace } = workspaceOf(exec)
      return { text: renderInspected(await access.manager.inspect({ workspace, ...(args.file_path ? { file: args.file_path } : {}), query: args.name, exact: true, limit: 20 }, exec.signal)) }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'typelens_list_types',
    description: 'List bounded type declarations relevant to a local workspace file.',
    parameters: {
      file_path: { type: 'string', description: 'Optional source file relative to the session workspace.' },
      query: { type: 'string', description: 'Optional case-insensitive name filter.' },
      kind: { type: 'string', description: 'Optional declaration kind filter such as interface, typealias, class, enum, function, or variable.' },
      limit: { type: 'number', description: 'Maximum declarations, from 1 to 500.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.explicitTimeoutMs,
    async execute(args, exec) {
      const { workspace } = workspaceOf(exec)
      return { text: renderInspected(await access.manager.inspect({ workspace, ...(args.file_path ? { file: args.file_path } : {}), ...(args.query ? { query: args.query } : {}), ...(args.kind ? { kind: args.kind } : {}), ...(args.limit ? { limit: args.limit } : {}) }, exec.signal)) }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'typelens_check',
    description: 'Run bounded local TypeScript diagnostics for a file and its project.',
    parameters: { file_path: { type: 'string', description: 'Optional file. Omit to check the configured project.' } },
    output: TEXT_OUTPUT,
    timeoutMs: config.explicitTimeoutMs,
    async execute(args, exec) {
      const { workspace, sessionId } = workspaceOf(exec)
      let file = args.file_path
      if (!file) file = (await access.manager.inspect({ workspace, limit: 1 }, exec.signal))[0]?.file
      if (!file) throw new Error('missing-project: no supported source file found')
      return { text: formatDiagnostics(await access.manager.analyzeDiagnostics({ workspace, file, sessionId: `${sessionId}:explicit:${Date.now()}` }, exec.signal)) }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'typelens_explain',
    description: 'Explain the active TypeLens configuration, health, circuit state, and aggregate source-free metrics.',
    parameters: { file_path: { type: 'string', description: 'Optional source file for project, adapter, and budget details.' } },
    output: TEXT_OUTPUT,
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const snapshot = access.snapshot()
      if (!args.file_path) return { text: JSON.stringify(snapshot, null, 2) }
      const { workspace } = workspaceOf(exec)
      return { text: JSON.stringify({ ...snapshot, file: await access.manager.explain({ workspace, file: args.file_path }, exec.signal) }, null, 2) }
    },
  }))
}
