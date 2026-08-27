export type DegradationCode =
  | 'unsupported-file'
  | 'outside-workspace'
  | 'excluded-path'
  | 'oversized-file'
  | 'missing-project'
  | 'missing-adapter'
  | 'timeout'
  | 'cancelled'
  | 'circuit-open'
  | 'analysis-failed'

export interface SourceRange {
  readonly startLine?: number
  readonly endLine?: number
}

export interface ContextAnalysis {
  readonly kind: 'context'
  readonly file: string
  readonly text: string
  readonly declarations: number
  readonly estimatedTokens: number
  readonly durationMs: number
  readonly cacheHit: boolean
  readonly truncated: boolean
  readonly degradation?: DegradationCode
}

export interface DiagnosticItem {
  readonly file: string
  readonly line: number
  readonly character: number
  readonly code: number
  readonly category: 'error' | 'warning' | 'suggestion' | 'message'
  readonly message: string
  readonly isNew: boolean
}

export interface DiagnosticAnalysis {
  readonly kind: 'diagnostics'
  readonly file: string
  readonly diagnostics: readonly DiagnosticItem[]
  readonly omitted: number
  readonly durationMs: number
  readonly degradation?: DegradationCode
}

export type TypeLensAnalysis = ContextAnalysis | DiagnosticAnalysis

export interface TypeLensHealth {
  readonly status: 'healthy' | 'degraded' | 'paused'
  readonly version: string
  readonly dshTarget: string
  readonly activeWorkspaces: number
  readonly lastDegradation?: DegradationCode
}
