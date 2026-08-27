import { realpath, stat } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { minimatch } from 'minimatch'
import type { TypeLensConfig } from './config.js'

export interface ResolvedWorkspaceFile {
  readonly absolutePath: string
  readonly relativePath: string
  readonly exists: boolean
  readonly size?: number
}

export class PathPolicyError extends Error {
  constructor(readonly code: 'outside-workspace' | 'excluded-path' | 'oversized-file', message: string) {
    super(`${code}: ${message}`)
    this.name = 'PathPolicyError'
  }
}

function isContained(root: string, candidate: string): boolean {
  const rel = relative(root, candidate)
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))
}

export async function resolveWorkspaceFile(
  workspace: string,
  candidate: string,
  config: TypeLensConfig,
  options: { mayNotExist?: boolean } = {},
): Promise<ResolvedWorkspaceFile> {
  const root = await realpath(workspace)
  const requested = isAbsolute(candidate) ? resolve(candidate) : resolve(root, candidate)
  if (!config.allowOutsideWorkspace && !isContained(root, requested)) {
    throw new PathPolicyError('outside-workspace', 'requested path is outside the session workspace')
  }
  let actual: string
  let info: Awaited<ReturnType<typeof stat>> | undefined
  try {
    actual = await realpath(requested)
    info = await stat(actual)
  } catch (error) {
    if (!options.mayNotExist || !(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
    const parent = await realpath(dirname(requested))
    actual = resolve(parent, requested.slice(dirname(requested).length + 1))
  }
  if (!config.allowOutsideWorkspace && !isContained(root, actual)) {
    throw new PathPolicyError('outside-workspace', 'resolved path escapes the session workspace')
  }
  const relativePath = relative(root, actual).split(sep).join('/') || '.'
  const allowed = config.allowGlobs.length === 0 || config.allowGlobs.some(glob => minimatch(relativePath, glob, { dot: true }))
  const denied = config.denyGlobs.some(glob => minimatch(relativePath, glob, { dot: true }))
  if (!allowed || denied) throw new PathPolicyError('excluded-path', relativePath)
  if (info?.size !== undefined && info.size > config.maxFileBytes) {
    throw new PathPolicyError('oversized-file', `${relativePath} is ${info.size} bytes`)
  }
  return Object.freeze({ absolutePath: actual, relativePath, exists: info !== undefined, ...(info ? { size: info.size } : {}) })
}
