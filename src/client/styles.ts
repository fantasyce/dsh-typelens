export const TYPELENS_STYLES = `
.typelens-page { max-width: 960px; padding: 28px; color: var(--color-text, #1f2937); }
.typelens-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
.typelens-header h2 { margin: 0 0 4px; font-size: 24px; }
.typelens-header p { margin: 0; color: var(--color-text-secondary, #64748b); }
.typelens-status { border: 1px solid #bbf7d0; border-radius: 999px; padding: 6px 10px; background: #f0fdf4; color: #166534; font-size: 13px; white-space: nowrap; }
.typelens-status.paused { border-color: #fed7aa; background: #fff7ed; color: #9a3412; }
.typelens-grid { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(260px, .7fr); gap: 16px; }
.typelens-card { margin: 0; border: 1px solid var(--color-border, #e2e8f0); border-radius: 12px; padding: 18px; background: var(--color-surface, #fff); }
.typelens-card legend, .typelens-card h3 { margin: 0 0 14px; padding: 0; font-size: 16px; font-weight: 650; }
.typelens-card label { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 40px; }
.typelens-card input[type="number"] { width: 110px; border: 1px solid var(--color-border, #cbd5e1); border-radius: 7px; padding: 6px 8px; color: inherit; background: inherit; }
.typelens-metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 0; }
.typelens-metrics div { border-bottom: 1px solid var(--color-border, #e2e8f0); padding-bottom: 8px; }
.typelens-metrics dt { color: var(--color-text-secondary, #64748b); font-size: 12px; }
.typelens-metrics dd { margin: 3px 0 0; font-variant-numeric: tabular-nums; }
.typelens-local { margin: 16px 0 0; color: var(--color-text-secondary, #64748b); font-size: 13px; line-height: 1.5; }
.typelens-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.typelens-actions button { border-radius: 8px; padding: 8px 14px; font: inherit; cursor: pointer; }
.typelens-actions .primary { border: 1px solid #111827; background: #111827; color: #fff; }
.typelens-actions .secondary { border: 1px solid var(--color-border, #cbd5e1); background: transparent; color: inherit; }
.typelens-actions button:disabled { cursor: progress; opacity: .55; }
.typelens-error { color: #b91c1c; }
.typelens-message { color: #166534; }
@media (max-width: 720px) { .typelens-page { padding: 18px; } .typelens-grid { grid-template-columns: 1fr; } .typelens-header { flex-direction: column; } }
`
