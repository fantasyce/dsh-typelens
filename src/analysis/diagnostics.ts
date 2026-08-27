import { relative, sep } from 'node:path'
import ts from 'typescript'
import type { DiagnosticAnalysis, DiagnosticItem } from '../types.js'

function categoryOf(category: ts.DiagnosticCategory): DiagnosticItem['category'] {
  switch (category) {
    case ts.DiagnosticCategory.Error: return 'error'
    case ts.DiagnosticCategory.Warning: return 'warning'
    case ts.DiagnosticCategory.Suggestion: return 'suggestion'
    default: return 'message'
  }
}

function keyOf(item: Omit<DiagnosticItem, 'isNew'>): string {
  return `${item.file}:${item.line}:${item.character}:${item.code}:${item.message}`
}

export class DiagnosticDeltaTracker {
  readonly #seen = new Map<string, Set<string>>()

  mark(sessionId: string, items: readonly Omit<DiagnosticItem, 'isNew'>[]): readonly DiagnosticItem[] {
    const previous = this.#seen.get(sessionId) ?? new Set<string>()
    const current = new Set<string>()
    const marked = items.map(item => {
      const key = keyOf(item)
      current.add(key)
      return Object.freeze({ ...item, isNew: !previous.has(key) })
    })
    this.#seen.set(sessionId, current)
    return marked
  }

  clear(): void { this.#seen.clear() }
}

export function buildDiagnostics(
  program: ts.Program,
  workspace: string,
  changedFile: string,
  sessionId: string,
  limit: number,
  tracker: DiagnosticDeltaTracker,
  durationMs: number,
): DiagnosticAnalysis {
  const diagnostics = [...program.getSyntacticDiagnostics(), ...program.getSemanticDiagnostics()]
  const items = diagnostics.flatMap((diagnostic): Omit<DiagnosticItem, 'isNew'>[] => {
    if (!diagnostic.file || diagnostic.start === undefined) return []
    const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
    return [{
      file: relative(workspace, diagnostic.file.fileName).split(sep).join('/'),
      line: position.line + 1,
      character: position.character + 1,
      code: diagnostic.code,
      category: categoryOf(diagnostic.category),
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    }]
  }).sort((a, b) => {
    const aChanged = a.file === changedFile ? 0 : 1
    const bChanged = b.file === changedFile ? 0 : 1
    return aChanged - bChanged || a.file.localeCompare(b.file) || a.line - b.line || a.character - b.character
  })
  const marked = tracker.mark(sessionId, items)
  return Object.freeze({
    kind: 'diagnostics', file: changedFile, diagnostics: Object.freeze(marked.slice(0, limit)),
    omitted: Math.max(0, marked.length - limit), durationMs,
  })
}
