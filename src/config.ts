const DEFAULT_DENY_GLOBS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.svelte-kit/**',
  '**/coverage/**',
  '**/.env',
  '**/.env.*',
] as const

export interface TypeLensConfig {
  readonly automaticContext: boolean
  readonly automaticDiagnostics: boolean
  readonly contextTokenBudget: number
  readonly maxDepth: number
  readonly automaticTimeoutMs: number
  readonly explicitTimeoutMs: number
  readonly maxFileBytes: number
  readonly maxDiagnostics: number
  readonly maxWorkspaceServices: number
  readonly maxCachedDocuments: number
  readonly allowOutsideWorkspace: boolean
  readonly allowGlobs: readonly string[]
  readonly denyGlobs: readonly string[]
}

export const DEFAULT_CONFIG: TypeLensConfig = Object.freeze({
  automaticContext: true,
  automaticDiagnostics: true,
  contextTokenBudget: 800,
  maxDepth: 4,
  automaticTimeoutMs: 1_500,
  explicitTimeoutMs: 5_000,
  maxFileBytes: 2 * 1024 * 1024,
  maxDiagnostics: 40,
  maxWorkspaceServices: 8,
  maxCachedDocuments: 2_000,
  allowOutsideWorkspace: false,
  allowGlobs: Object.freeze([]),
  denyGlobs: Object.freeze([...DEFAULT_DENY_GLOBS]),
})

const BOUNDS: Record<string, readonly [number, number]> = {
  contextTokenBudget: [32, 16_000],
  maxDepth: [0, 16],
  automaticTimeoutMs: [100, 30_000],
  explicitTimeoutMs: [100, 60_000],
  maxFileBytes: [1_024, 64 * 1024 * 1024],
  maxDiagnostics: [1, 1_000],
  maxWorkspaceServices: [1, 64],
  maxCachedDocuments: [10, 100_000],
}

const BOOLEAN_KEYS = new Set(['automaticContext', 'automaticDiagnostics', 'allowOutsideWorkspace'])
const GLOB_KEYS = new Set(['allowGlobs', 'denyGlobs'])
const KNOWN_KEYS = new Set([...Object.keys(BOUNDS), ...BOOLEAN_KEYS, ...GLOB_KEYS])

function normalizeGlobs(key: string, value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new TypeError(`${key} must be an array of strings`)
  }
  const globs = [...new Set(value.map(item => item.trim()).filter(Boolean))]
  if (globs.some(item => item.includes('\0'))) throw new TypeError(`${key} contains an invalid glob`)
  return Object.freeze(globs)
}

export function normalizeConfig(input: unknown): TypeLensConfig {
  if (input === undefined || input === null) return DEFAULT_CONFIG
  if (typeof input !== 'object' || Array.isArray(input)) throw new TypeError('configuration must be an object')
  const raw = input as Record<string, unknown>
  for (const key of Object.keys(raw)) {
    if (!KNOWN_KEYS.has(key)) throw new TypeError(`unknown configuration key: ${key}`)
  }
  const resolved: Record<string, unknown> = { ...DEFAULT_CONFIG }
  for (const key of BOOLEAN_KEYS) {
    if (raw[key] !== undefined) {
      if (typeof raw[key] !== 'boolean') throw new TypeError(`${key} must be a boolean`)
      resolved[key] = raw[key]
    }
  }
  for (const [key, [min, max]] of Object.entries(BOUNDS)) {
    if (raw[key] !== undefined) {
      const value = raw[key]
      if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
        throw new RangeError(`${key} must be an integer between ${min} and ${max}`)
      }
      resolved[key] = value
    }
  }
  for (const key of GLOB_KEYS) {
    if (raw[key] !== undefined) resolved[key] = normalizeGlobs(key, raw[key])
  }
  return Object.freeze(resolved) as unknown as TypeLensConfig
}
