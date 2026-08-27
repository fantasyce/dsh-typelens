import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type ToolExecution } from '@deepseek-ai/dsh-tools'
import type { TypeLensConfig } from './config.js'
import type { CircuitBreaker } from './availability/circuit-breaker.js'
import type { MetricsStore } from './metrics.js'
import type { ProjectManager } from './project/manager.js'
import { formatDiagnostics } from './dsh/format.js'

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

export function registerTypeLensTools(
  ctx: Context,
  manager: ProjectManager,
  config: TypeLensConfig,
  breaker: CircuitBreaker,
  metrics: MetricsStore,
): void {
  ctx.tools.register(defineTool({
    name: 'typelens_lookup_type',
    description: 'Find type declarations relevant to a named symbol in a local workspace file. Source never leaves the machine.',
    parameters: {
      file_path: { type: 'string', required: true, description: 'Source file relative to the session workspace.' },
      name: { type: 'string', required: true, description: 'Type, interface, class, function, or symbol name.' },
    },
    output: TEXT_OUTPUT,
    timeoutMs: config.explicitTimeoutMs,
    async execute(args, exec) {
      const { workspace } = workspaceOf(exec)
      const result = await manager.analyzeContext({ workspace, file: args.file_path }, exec.signal)
      const lower = args.name.toLowerCase()
      const blocks = result.text.split(/\n\n+/u).filter(block => block.toLowerCase().includes(lower))
      return { text: blocks.length > 0 ? blocks.join('\n\n') : `No declaration matching ${args.name} was found in the bounded context for ${result.file}.` }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'typelens_list_types',
    description: 'List bounded type declarations relevant to a local workspace file.',
    parameters: { file_path: { type: 'string', required: true, description: 'Source file relative to the session workspace.' } },
    output: TEXT_OUTPUT,
    timeoutMs: config.explicitTimeoutMs,
    async execute(args, exec) {
      const { workspace } = workspaceOf(exec)
      const result = await manager.analyzeContext({ workspace, file: args.file_path }, exec.signal)
      return { text: result.text || `No relevant declarations found for ${result.file}.` }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'typelens_check',
    description: 'Run bounded local TypeScript diagnostics for a file and its project.',
    parameters: { file_path: { type: 'string', required: true, description: 'Source file relative to the session workspace.' } },
    output: TEXT_OUTPUT,
    timeoutMs: config.explicitTimeoutMs,
    async execute(args, exec) {
      const { workspace, sessionId } = workspaceOf(exec)
      return { text: formatDiagnostics(await manager.analyzeDiagnostics({ workspace, file: args.file_path, sessionId }, exec.signal)) }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'typelens_explain',
    description: 'Explain the active TypeLens configuration, health, circuit state, and aggregate source-free metrics.',
    parameters: {},
    output: TEXT_OUTPUT,
    isConcurrencySafe: () => true,
    async execute() {
      return { text: JSON.stringify({
        product: 'DSH TypeLens', version: '0.1.0', targetDsh: '0.1.1-rc.2',
        localOnly: true, config, circuit: breaker.snapshot(), metrics: metrics.snapshot(),
      }, null, 2) }
    },
  }))
}
