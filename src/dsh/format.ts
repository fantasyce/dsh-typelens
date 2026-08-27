import type { DiagnosticAnalysis } from '../types.js'

export function formatDiagnostics(result: DiagnosticAnalysis): string {
  if (result.diagnostics.length === 0) return `<typelens_diagnostics status="clean" duration_ms="${result.durationMs}" />`
  const fresh = result.diagnostics.filter(item => item.isNew)
  const existing = result.diagnostics.length - fresh.length
  const lines = fresh.map(item => `${item.file}:${item.line}:${item.character} TS${item.code} [new] ${item.message}`)
  if (existing > 0) lines.push(`${existing} unchanged diagnostics summarized; run typelens_check after changes to refresh.`)
  if (result.omitted > 0) lines.push(`... ${result.omitted} additional diagnostics omitted by limit`)
  return `<typelens_diagnostics analysis_origin="local" new="${fresh.length}" existing="${existing}" omitted="${result.omitted}" duration_ms="${result.durationMs}">\n${lines.join('\n')}\n</typelens_diagnostics>`
}
