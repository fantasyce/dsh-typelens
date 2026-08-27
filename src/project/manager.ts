import { readFile, stat } from 'node:fs/promises'
import type { TypeLensConfig } from '../config.js'
import { resolveWorkspaceFile } from '../path-policy.js'
import type { ContextAnalysis, DiagnosticAnalysis, SourceRange } from '../types.js'
import { buildTypeContext } from '../analysis/context.js'
import { buildDiagnostics, DiagnosticDeltaTracker } from '../analysis/diagnostics.js'
import { discoverProject } from './discovery.js'
import { loadProject } from './language-service.js'

export interface ContextRequest {
  readonly workspace: string
  readonly file: string
  readonly range?: SourceRange
}

export interface DiagnosticRequest {
  readonly workspace: string
  readonly file: string
  readonly sessionId: string
}

export class ProjectManager {
  readonly #diagnostics = new DiagnosticDeltaTracker()
  constructor(readonly config: TypeLensConfig) {}

  async analyzeContext(request: ContextRequest, signal: AbortSignal): Promise<ContextAnalysis> {
    signal.throwIfAborted()
    const started = performance.now()
    const resolved = await resolveWorkspaceFile(request.workspace, request.file, this.config)
    signal.throwIfAborted()
    await readFile(resolved.absolutePath, 'utf8')
    const discovery = await discoverProject(request.workspace, resolved.absolutePath)
    signal.throwIfAborted()
    const { program } = loadProject(discovery, resolved.absolutePath)
    const source = program.getSourceFile(resolved.absolutePath)
    if (!source) throw new Error('analysis-failed: TypeScript did not load the requested source file')
    const context = buildTypeContext(program, source, discovery.projectRoot, this.config, request.range)
    const currentStat = await stat(resolved.absolutePath)
    signal.throwIfAborted()
    return Object.freeze({
      ...context,
      file: resolved.relativePath,
      durationMs: Math.max(0, Math.round(performance.now() - started)),
      cacheHit: false,
      sourceVersion: `${currentStat.mtimeMs}:${currentStat.size}`,
    }) as ContextAnalysis
  }

  async analyzeDiagnostics(request: DiagnosticRequest, signal: AbortSignal): Promise<DiagnosticAnalysis> {
    signal.throwIfAborted()
    const started = performance.now()
    const resolved = await resolveWorkspaceFile(request.workspace, request.file, this.config)
    const discovery = await discoverProject(request.workspace, resolved.absolutePath)
    signal.throwIfAborted()
    const { program } = loadProject(discovery, resolved.absolutePath)
    signal.throwIfAborted()
    return buildDiagnostics(
      program, discovery.projectRoot, resolved.relativePath, request.sessionId,
      this.config.maxDiagnostics, this.#diagnostics, Math.max(0, Math.round(performance.now() - started)),
    )
  }

  clear(): void { this.#diagnostics.clear() }
}
