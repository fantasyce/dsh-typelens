import { useEffect, useState } from 'react'
import { TYPELENS_STYLES } from './styles.js'
import { en, type TypeLensLocaleKey } from './locales.js'

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
  analysisLocal: boolean
  externalNetworkRequests: boolean
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

export interface TypeLensSettingsProps {
  readonly endpoint?: string
  readonly t?: (key: TypeLensLocaleKey) => string
}

export function TypeLensSettings({ endpoint = '/api/typelens', t }: TypeLensSettingsProps): JSX.Element {
  const text = (key: TypeLensLocaleKey): string => t?.(key) ?? en[key]
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
      setMessage(text('saved'))
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
    finally { setBusy(false) }
  }

  async function reset(): Promise<void> {
    setBusy(true); setError(undefined); setMessage(undefined)
    try {
      const value = await request(endpoint, { method: 'POST' })
      setSnapshot(value)
      setMessage(text('resetDone'))
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
    finally { setBusy(false) }
  }

  if (!snapshot || !draft) return <section className="typelens-page" aria-busy="true"><p>{error ?? text('loading')}</p></section>

  return (
    <section className="typelens-page" aria-labelledby="typelens-title">
      <header className="typelens-header">
        <div><h2 id="typelens-title">{text('title')}</h2><p>{text('subtitle')}</p></div>
        <div className={`typelens-status ${snapshot.circuit.paused ? 'paused' : 'healthy'}`} role="status">
          {snapshot.circuit.paused ? text('paused') : text('healthy')} · <span>{snapshot.version}</span>
        </div>
      </header>

      <div className="typelens-grid">
        <fieldset className="typelens-card">
          <legend>{text('automatic')}</legend>
          <label><input type="checkbox" checked={draft.automaticContext} onChange={event => setDraft({ ...draft, automaticContext: event.target.checked })} /> {text('automaticContext')}</label>
          <label><input type="checkbox" checked={draft.automaticDiagnostics} onChange={event => setDraft({ ...draft, automaticDiagnostics: event.target.checked })} /> {text('automaticDiagnostics')}</label>
          <label>{text('contextBudget')}<input aria-label={text('contextBudget')} type="number" min={32} max={16000} value={draft.contextTokenBudget} onChange={event => setDraft({ ...draft, contextTokenBudget: Number(event.target.value) })} /></label>
          <label>{text('importDepth')}<input aria-label={text('importDepth')} type="number" min={0} max={16} value={draft.maxDepth} onChange={event => setDraft({ ...draft, maxDepth: Number(event.target.value) })} /></label>
          <label>{text('maxDiagnostics')}<input aria-label={text('maxDiagnostics')} type="number" min={1} max={1000} value={draft.maxDiagnostics} onChange={event => setDraft({ ...draft, maxDiagnostics: Number(event.target.value) })} /></label>
        </fieldset>

        <section className="typelens-card" aria-labelledby="typelens-health"><h3 id="typelens-health">{text('health')}</h3>
          <dl className="typelens-metrics">
            <div><dt>{text('requests')}</dt><dd>{snapshot.metrics.requests}</dd></div>
            <div><dt>{text('injections')}</dt><dd>{snapshot.metrics.injections}</dd></div>
            <div><dt>{text('cacheHits')}</dt><dd>{snapshot.metrics.cacheHits}</dd></div>
            <div><dt>{text('timeouts')}</dt><dd>{snapshot.metrics.timeouts}</dd></div>
            <div><dt>{text('failures')}</dt><dd>{snapshot.metrics.failures}</dd></div>
            <div><dt>{text('dshTarget')}</dt><dd>{snapshot.targetDsh}</dd></div>
          </dl>
          <p className="typelens-local">{text('privacy')}</p>
        </section>
      </div>

      {error && <p className="typelens-error" role="alert">{error}</p>}
      {message && <p className="typelens-message" role="status">{message}</p>}
      <footer className="typelens-actions">
        <button type="button" className="secondary" disabled={busy} onClick={() => { void reset() }}>{text('reset')}</button>
        <button type="button" className="primary" disabled={busy} onClick={() => { void save() }}>{text('save')}</button>
      </footer>
    </section>
  )
}
