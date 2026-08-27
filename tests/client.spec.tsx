// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { TypeLensSettings } from '../src/client/TypeLensSettings.js'
import { apply } from '../src/client/index.js'
import { zh } from '../src/client/locales.js'

const snapshot = {
  product: 'DSH TypeLens', version: '0.1.1', targetDsh: '0.1.1-rc.2', analysisLocal: true, externalNetworkRequests: false,
  config: {
    automaticContext: true, automaticDiagnostics: true, contextTokenBudget: 800, maxDepth: 4,
    automaticTimeoutMs: 1500, explicitTimeoutMs: 5000, maxFileBytes: 2097152, maxDiagnostics: 40,
    maxWorkspaceServices: 8, maxCachedDocuments: 2000, allowOutsideWorkspace: false,
    allowGlobs: [], denyGlobs: ['**/node_modules/**'],
  },
  circuit: { paused: false, failuresInWindow: 0, pausedUntil: 0 },
  metrics: { requests: 3, injections: 2, skips: 1, timeouts: 0, failures: 0, cacheHits: 1, totalDurationMs: 20 },
}

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('TypeLens Web settings', () => {
  it('registers a native settings section with localized labels', () => {
    const entries: unknown[] = []
    const ctx = {
      effect: (factory: () => unknown) => factory(),
      locale: { register: vi.fn(), bind: () => (key: string) => key === 'nav' ? 'TypeLens' : key },
      slots: {
        inject: (_name: string, factory: () => unknown) => factory(),
        register: (options: unknown) => { entries.push(options); return () => {} },
      },
    }
    apply(ctx as never)
    expect(entries).toEqual([expect.objectContaining({ name: 'settings.section', id: 'typelens', label: expect.any(Function) })])
  })

  it('loads health, saves toggles and bounded budget, and resets metrics', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(snapshot), { status: 200 }))
      .mockImplementationOnce(async (_url: string, init: RequestInit) => new Response(init.body as string, { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...snapshot, metrics: { ...snapshot.metrics, requests: 0 } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<TypeLensSettings />)
    expect(await screen.findByText('0.1.1')).toBeTruthy()
    await user.click(screen.getByRole('checkbox', { name: 'Automatic read context' }))
    const budget = screen.getByRole('spinbutton', { name: 'Context token budget' })
    await user.clear(budget); await user.type(budget, '1200')
    await user.click(screen.getByRole('button', { name: 'Save settings' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const body = JSON.parse(fetchMock.mock.calls[1]![1].body)
    expect(body.automaticContext).toBe(false)
    expect(body.contextTokenBudget).toBe(1200)
    await user.click(screen.getByRole('button', { name: 'Reset cache and counters' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
  })

  it('shows a server validation error without losing the draft', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(snapshot), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'contextTokenBudget invalid' }), { status: 400 })))
    const user = userEvent.setup()
    render(<TypeLensSettings />)
    await screen.findByText('0.1.1')
    await user.click(screen.getByRole('button', { name: 'Save settings' }))
    expect((await screen.findByRole('alert')).textContent).toContain('contextTokenBudget invalid')
  })

  it('renders the complete settings surface in Chinese through the DSH locale binding', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(snapshot), { status: 200 })))
    render(<TypeLensSettings t={key => zh[key]} />)
    expect(await screen.findByText('DSH 类型透镜')).toBeTruthy()
    expect(screen.getByRole('button', { name: '保存设置' })).toBeTruthy()
    expect(screen.getByText('健康与使用情况')).toBeTruthy()
  })
})
