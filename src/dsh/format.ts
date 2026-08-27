import type { DiagnosticAnalysis } from '../types.js'

export function formatDiagnostics(result: DiagnosticAnalysis): string {
  if (result.diagnostics.length === 0) return '<typelens_diagnostics status="clean" />'
  const lines = result.diagnostics.map(item => {
    const state = item.isNew ? 'new' : 'existing'
    return `${item.file}:${item.line}:${item.character} TS${item.code} [${state}] ${item.message}`
  })
  if (result.omitted > 0) lines.push(`... ${result.omitted} additional diagnostics omitted by limit`)
  return `<typelens_diagnostics local_only="true">\n${lines.join('\n')}\n</typelens_diagnostics>`
}
