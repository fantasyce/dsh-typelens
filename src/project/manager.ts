import { readFile, realpath, stat } from 'node:fs/promises'
import { dirname, isAbsolute, relative, sep } from 'node:path'
import ts from 'typescript'
import type { TypeLensConfig } from '../config.js'
import { adaptSource } from '../adapters/index.js'
import { LruCache } from '../cache/lru.js'
import { resolveWorkspaceFile } from '../path-policy.js'
import type { ContextAnalysis, DiagnosticAnalysis, SourceRange } from '../types.js'
import { buildTypeContext } from '../analysis/context.js'
import { buildDiagnostics, DiagnosticDeltaTracker } from '../analysis/diagnostics.js'
import { inspectTypes, type InspectedType } from '../analysis/inspect.js'
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

interface ContextCacheEntry {
  readonly result: ContextAnalysis
  readonly versions: ReadonlyMap<string, string>
}

interface WorkspaceCache {
  readonly context: LruCache<string, ContextCacheEntry>
}

function contained(root: string, file: string): boolean {
  const rel = relative(root, file)
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
}

async function versionOf(file: string): Promise<string> {
  const value = await stat(file)
  return `${value.mtimeMs}:${value.size}`
}

async function versionsMatch(versions: ReadonlyMap<string, string>): Promise<boolean> {
  try {
    const current = await Promise.all([...versions].map(async ([file, expected]) => [expected, await versionOf(file)] as const))
    return current.every(([expected, actual]) => expected === actual)
  } catch { return false }
}

export class ProjectManager {
  readonly #diagnostics = new DiagnosticDeltaTracker()
  readonly #workspaces: LruCache<string, WorkspaceCache>

  constructor(readonly config: TypeLensConfig) {
    this.#workspaces = new LruCache(config.maxWorkspaceServices)
  }

  async analyzeContext(request: ContextRequest, signal: AbortSignal): Promise<ContextAnalysis> {
    signal.throwIfAborted()
    const started = performance.now()
    const resolved = await resolveWorkspaceFile(request.workspace, request.file, this.config)
    const workspaceKey = await realpath(request.workspace)
    let workspaceCache = this.#workspaces.get(workspaceKey)
    if (!workspaceCache) {
      workspaceCache = { context: new LruCache(this.config.maxCachedDocuments) }
      this.#workspaces.set(workspaceKey, workspaceCache)
    }
    const cacheKey = `${resolved.relativePath}:${request.range?.startLine ?? ''}:${request.range?.endLine ?? ''}`
    const cached = workspaceCache.context.get(cacheKey)
    if (cached && await versionsMatch(cached.versions)) {
      signal.throwIfAborted()
      return Object.freeze({
        ...cached.result, cacheHit: true,
        durationMs: Math.max(0, Math.round(performance.now() - started)),
      })
    }
    if (cached) workspaceCache.context.delete(cacheKey)
    signal.throwIfAborted()
    const text = await readFile(resolved.absolutePath, 'utf8')
    const adapted = await adaptSource(resolved.absolutePath, text)
    if (!adapted) throw new Error('unsupported-file: TypeLens supports TS, TSX, JS, JSX, Vue, and Svelte source')
    const discovery = await discoverProject(request.workspace, resolved.absolutePath)
    signal.throwIfAborted()
    const { program } = loadProject(discovery, adapted, this.config.maxFileBytes)
    const source = program.getSourceFile(adapted.virtualFileName)
    if (!source) throw new Error('analysis-failed: TypeScript did not load the requested source file')
    const lineOffset = text.slice(0, adapted.sourceOffset).split('\n').length - 1
    const range = request.range && adapted.sourceOffset > 0 ? {
      ...(request.range.startLine === undefined ? {} : { startLine: Math.max(1, request.range.startLine - lineOffset) }),
      ...(request.range.endLine === undefined ? {} : { endLine: Math.max(1, request.range.endLine - lineOffset) }),
    } : request.range
    const context = buildTypeContext(program, source, workspaceKey, this.config, range)
    const currentStat = await stat(resolved.absolutePath)
    signal.throwIfAborted()
    const result = Object.freeze({
      ...context,
      file: resolved.relativePath,
      durationMs: Math.max(0, Math.round(performance.now() - started)),
      cacheHit: false,
      sourceVersion: `${currentStat.mtimeMs}:${currentStat.size}`,
    }) as ContextAnalysis
    const versionFiles = [...new Set(program.getSourceFiles().map(sourceFile =>
      sourceFile.fileName === adapted.virtualFileName ? resolved.absolutePath : sourceFile.fileName,
    ).filter(file => contained(workspaceKey, file) && !file.split(sep).includes('node_modules')))]
    if (versionFiles.length <= this.config.maxCachedDocuments) {
      const versions = new Map(await Promise.all(versionFiles.map(async file => [file, await versionOf(file)] as const)))
      workspaceCache.context.set(cacheKey, { result, versions })
    }
    return result
  }

  async analyzeDiagnostics(request: DiagnosticRequest, signal: AbortSignal): Promise<DiagnosticAnalysis> {
    signal.throwIfAborted()
    const started = performance.now()
    const resolved = await resolveWorkspaceFile(request.workspace, request.file, this.config)
    const workspaceKey = await realpath(request.workspace)
    const text = await readFile(resolved.absolutePath, 'utf8')
    const adapted = await adaptSource(resolved.absolutePath, text)
    if (!adapted) throw new Error('unsupported-file: TypeLens supports TS, TSX, JS, JSX, Vue, and Svelte source')
    const discovery = await discoverProject(request.workspace, resolved.absolutePath)
    signal.throwIfAborted()
    const { program } = loadProject(discovery, adapted, this.config.maxFileBytes)
    signal.throwIfAborted()
    const lineOffset = text.slice(0, adapted.sourceOffset).split('\n').length - 1
    return buildDiagnostics(
      program, workspaceKey, resolved.relativePath, request.sessionId,
      this.config.maxDiagnostics, this.#diagnostics, Math.max(0, Math.round(performance.now() - started)),
      adapted.sourceOffset > 0 ? {
        virtualFile: adapted.virtualFileName,
        originalFile: resolved.relativePath,
        lineOffset,
      } : undefined,
    )
  }

  async inspect(request: { workspace: string; file?: string; query?: string; kind?: string; exact?: boolean; limit?: number }, signal: AbortSignal): Promise<readonly InspectedType[]> {
    signal.throwIfAborted()
    const workspace = await realpath(request.workspace)
    let entry = request.file
    if (!entry) {
      const configPath = ts.findConfigFile(workspace, ts.sys.fileExists, 'tsconfig.json') ?? ts.findConfigFile(workspace, ts.sys.fileExists, 'jsconfig.json')
      if (!configPath) throw new Error('missing-project: file_path is required when no tsconfig.json or jsconfig.json exists')
      const read = ts.readConfigFile(configPath, ts.sys.readFile)
      if (read.error) throw new Error('analysis-failed: project configuration could not be read')
      const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, dirname(configPath), undefined, configPath)
      entry = parsed.fileNames.find(file => contained(workspace, file))
      if (!entry) throw new Error('missing-project: project contains no supported source file')
    }
    const resolved = await resolveWorkspaceFile(workspace, entry, this.config)
    const text = await readFile(resolved.absolutePath, 'utf8')
    const adapted = await adaptSource(resolved.absolutePath, text)
    if (!adapted) throw new Error('unsupported-file: TypeLens supports TS, TSX, JS, JSX, Vue, and Svelte source')
    const discovery = await discoverProject(workspace, resolved.absolutePath)
    const { program } = loadProject(discovery, adapted, this.config.maxFileBytes)
    signal.throwIfAborted()
    return inspectTypes(program, workspace, { ...(request.query ? { query: request.query } : {}), ...(request.kind ? { kind: request.kind } : {}), ...(request.exact === undefined ? {} : { exact: request.exact }), limit: Math.min(500, Math.max(1, request.limit ?? 100)) })
  }

  async explain(request: { workspace: string; file: string }, signal: AbortSignal): Promise<unknown> {
    const resolved = await resolveWorkspaceFile(request.workspace, request.file, this.config)
    const text = await readFile(resolved.absolutePath, 'utf8')
    const adapted = await adaptSource(resolved.absolutePath, text)
    const project = await discoverProject(request.workspace, resolved.absolutePath)
    signal.throwIfAborted()
    return Object.freeze({ file: resolved.relativePath, adapter: adapted?.kind ?? 'unsupported', projectRoot: relative(await realpath(request.workspace), project.projectRoot).split(sep).join('/') || '.', configPath: project.configPath ? relative(await realpath(request.workspace), project.configPath).split(sep).join('/') : null, implicitProject: project.implicit, size: resolved.size, budgets: { contextTokenBudget: this.config.contextTokenBudget, maxDepth: this.config.maxDepth, automaticTimeoutMs: this.config.automaticTimeoutMs, explicitTimeoutMs: this.config.explicitTimeoutMs, maxDiagnostics: this.config.maxDiagnostics }, activeWorkspaceCaches: this.#workspaces.size })
  }

  clear(): void {
    this.#diagnostics.clear()
    this.#workspaces.clear()
  }
}
