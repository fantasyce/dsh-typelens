import type { SourceRange } from '../types.js'

export type FileOperation =
  | { readonly kind: 'read'; readonly file: string; readonly range?: SourceRange }
  | { readonly kind: 'write'; readonly file: string }

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function fileOf(args: Record<string, unknown>, key: 'file_path' | 'path'): string | undefined {
  const value = args[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function recognizeFileOperation(name: string, value: unknown): FileOperation | undefined {
  const args = record(value)
  if (!args) return undefined
  if (name === 'read') {
    const file = fileOf(args, 'file_path')
    if (!file) return undefined
    const offset = typeof args.offset === 'number' && Number.isInteger(args.offset) && args.offset > 0 ? args.offset : 1
    const limit = typeof args.limit === 'number' && Number.isInteger(args.limit) && args.limit > 0 ? args.limit : undefined
    return { kind: 'read', file, ...(limit ? { range: { startLine: offset, endLine: offset + limit - 1 } } : {}) }
  }
  if (name === 'write' || name === 'edit') {
    const file = fileOf(args, 'file_path')
    return file ? { kind: 'write', file } : undefined
  }
  if (name === 'str_replace_editor') {
    const file = fileOf(args, 'path')
    const command = args.command
    if (!file || typeof command !== 'string') return undefined
    if (command === 'view') {
      const range = Array.isArray(args.view_range) && args.view_range.length === 2
        && args.view_range.every(item => typeof item === 'number' && Number.isInteger(item) && item > 0)
        ? { startLine: args.view_range[0] as number, endLine: args.view_range[1] as number }
        : undefined
      return { kind: 'read', file, ...(range ? { range } : {}) }
    }
    if (command === 'create' || command === 'str_replace' || command === 'insert') return { kind: 'write', file }
  }
  return undefined
}
