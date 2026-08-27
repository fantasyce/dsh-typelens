import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-tools'
import { normalizeConfig, type TypeLensConfig } from './config.js'
import { TypeLensRuntime } from './runtime.js'
import { createPostExecuteHandler } from './dsh/hooks.js'
import { registerTypeLensTools } from './tools.js'
import { defaultSettingsPath, loadPersistedConfig, registerTypeLensHostApi } from './host-api.js'

export { DEFAULT_CONFIG, normalizeConfig, type TypeLensConfig } from './config.js'
export { ProjectManager } from './project/manager.js'
export { recognizeFileOperation } from './dsh/tool-recognition.js'

export const name = 'typelens'
export const inject = ['tools']

export type Config = Partial<Omit<TypeLensConfig, 'allowGlobs' | 'denyGlobs'>> & {
  allowGlobs?: string[]
  denyGlobs?: string[]
}

export const Config = z.object({
  automaticContext: z.boolean().default(true),
  automaticDiagnostics: z.boolean().default(true),
  contextTokenBudget: z.number().min(32).max(16_000).default(800),
  maxDepth: z.number().min(0).max(16).default(4),
  automaticTimeoutMs: z.number().min(100).max(30_000).default(1_500),
  explicitTimeoutMs: z.number().min(100).max(60_000).default(5_000),
  maxFileBytes: z.number().min(1_024).max(64 * 1024 * 1024).default(2 * 1024 * 1024),
  maxDiagnostics: z.number().min(1).max(1_000).default(40),
  maxWorkspaceServices: z.number().min(1).max(64).default(8),
  maxCachedDocuments: z.number().min(10).max(100_000).default(2_000),
  allowOutsideWorkspace: z.boolean().default(false),
  allowGlobs: z.array(z.string()).default([]),
  denyGlobs: z.array(z.string()).default([
    '**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/.next/**',
    '**/.svelte-kit/**', '**/coverage/**', '**/.env', '**/.env.*',
  ]),
})

export function apply(ctx: Context, input: Config = {}): void {
  const settingsPath = defaultSettingsPath()
  const config = loadPersistedConfig(settingsPath) ?? normalizeConfig(input)
  const runtime = new TypeLensRuntime(config)
  registerTypeLensTools(ctx, runtime)
  ctx.on('tools/post-execute', createPostExecuteHandler(runtime))
  registerTypeLensHostApi(ctx, runtime, settingsPath)
  ctx.effect(() => () => { runtime.dispose() }, 'typelens: release in-memory project state')
}
