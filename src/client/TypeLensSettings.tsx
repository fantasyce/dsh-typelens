import { useEffect, useState } from 'react'
import { TYPELENS_STYLES } from './styles.js'

const STYLE_ID = 'dsh-typelens-settings'

function ensureStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.dataset.plugin = 'dsh-typelens'
  style.textContent = TYPELENS_STYLES
  document.head.append(style)
}

interface ClientConfig {
  automaticContext: boolean
  automaticDiagnostics: boolean
  contextTokenBudget: number
  maxDepth: number
  automaticTimeoutMs: number
  explicitTimeoutMs: number
  maxFileBytes: number
  maxDiagnostics: number
  maxWorkspaceServices: number
  maxCachedDocuments: number
  allowOutsideWorkspace: boolean
  allowGlobs: string[]
  denyGlobs: string[]
}

interface Snapshot {
  product: string
  version: string
  targetDsh: string
  localOnly: boolean
  config: ClientConfig
  circuit: { paused: boolean; failuresInWindow: number; pausedUntil: number }
  metrics: { requests: number; injections: number; skips: number; timeouts: number; failures: number; cacheHits: number; totalDurationMs: number }
}

async function request(endpoint: string, init?: RequestInit): Promise<Snapshot> {
  const response = await fetch(endpoint, { cache: 'no-store', ...init })
  const body = await response.json() as Snapshot | { error?: string }
  if (!response.ok) throw new Error('error' in body && body.error ? body.error : `HTTP ${response.status}`)
  return body as Snapshot
}

export interface TypeLensSettingsProps { readonly endpoint?: string }

export function TypeLensSettings({ endpoint = '/api/typelens' }: TypeLensSettingsProps): JSX.Element {
  const [snapshot, setSnapshot] = useState<Snapshot>()
  const [draft, setDraft] = useState<ClientConfig>()
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ensureStyles()
    const controller = new AbortController()
    void request(endpoint, { signal: controller.signal })
      .then(value => { setSnapshot(value); setDraft(structuredClone(value.config)) })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason)) })
    return () => controller.abort()
  }, [endpoint])

  async function save(): Promise<void> {
    if (!draft) return
    setBusy(true); setError(undefined); setMessage(undefined)
    try {
      const value = await request(endpoint, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft) })
      if (value.config) { setSnapshot(value); setDraft(structuredClone(value.config)) }
      setMessage('Settings saved')
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
    finally { setBusy(false) }
  }

  async function reset(): Promise<void> {
    setBusy(true); setError(undefined); setMessage(undefined)
    try {
      const value = await request(endpoint, { method: 'POST' })
      setSnapshot(value)
      setMessage('Cache and counters reset')
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
    finally { setBusy(false) }
  }

  if (!snapshot || !draft) return <section className="typelens-page" aria-busy="true"><p>{error ?? 'Loading TypeLens…'}</p></section>

  return (
    <section className="typelens-page" aria-labelledby="typelens-title">
      <header className="typelens-header">
        <div><h2 id="typelens-title">DSH TypeLens</h2><p>Local type context and edit diagnostics</p></div>
        <div className={`typelens-status ${snapshot.circuit.paused ? 'paused' : 'healthy'}`} role="status">
          {snapshot.circuit.paused ? 'Paused' : 'Healthy'} · <span>{snapshot.version}</span>
        </div>
      </header>

      <div className="typelens-grid">
        <fieldset className="typelens-card">
          <legend>Automatic assistance</legend>
          <label><input type="checkbox" checked={draft.automaticContext} onChange={event => setDraft({ ...draft, automaticContext: event.target.checked })} /> Automatic read context</label>
          <label><input type="checkbox" checked={draft.automaticDiagnostics} onChange={event => setDraft({ ...draft, automaticDiagnostics: event.target.checked })} /> Automatic edit diagnostics</label>
          <label>Context token budget<input aria-label="Context token budget" type="number" min={32} max={16000} value={draft.contextTokenBudget} onChange={event => setDraft({ ...draft, contextTokenBudget: Number(event.target.value) })} /></label>
          <label>Import depth<input aria-label="Import depth" type="number" min={0} max={16} value={draft.maxDepth} onChange={event => setDraft({ ...draft, maxDepth: Number(event.target.value) })} /></label>
          <label>Maximum diagnostics<input aria-label="Maximum diagnostics" type="number" min={1} max={1000} value={draft.maxDiagnostics} onChange={event => setDraft({ ...draft, maxDiagnostics: Number(event.target.value) })} /></label>
        </fieldset>

        <section className="typelens-card" aria-labelledby="typelens-health"><h3 id="typelens-health">Health and usage</h3>
          <dl className="typelens-metrics">
            <div><dt>Requests</dt><dd>{snapshot.metrics.requests}</dd></div>
            <div><dt>Injections</dt><dd>{snapshot.metrics.injections}</dd></div>
            <div><dt>Cache hits</dt><dd>{snapshot.metrics.cacheHits}</dd></div>
            <div><dt>Timeouts</dt><dd>{snapshot.metrics.timeouts}</dd></div>
            <div><dt>Failures</dt><dd>{snapshot.metrics.failures}</dd></div>
            <div><dt>DSH target</dt><dd>{snapshot.targetDsh}</dd></div>
          </dl>
          <p className="typelens-local">Source processing is local-only. TypeLens records aggregate counters, never source text.</p>
        </section>
      </div>

      {error && <p className="typelens-error" role="alert">{error}</p>}
      {message && <p className="typelens-message" role="status">{message}</p>}
      <footer className="typelens-actions">
        <button type="button" className="secondary" disabled={busy} onClick={() => { void reset() }}>Reset cache and counters</button>
        <button type="button" className="primary" disabled={busy} onClick={() => { void save() }}>Save settings</button>
      </footer>
    </section>
  )
}
