import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { TypeLensConfig } from './config.js'
import { normalizeConfig } from './config.js'
import type { TypeLensRuntime } from './runtime.js'

export interface ApiResponse {
  readonly status: number
  readonly body: unknown
}

export function defaultSettingsPath(): string {
  const root = process.env.DSH_HOME?.trim() || join(homedir(), '.dsh')
  return join(root, 'typelens', 'settings.json')
}

export function loadPersistedConfig(path: string): TypeLensConfig | undefined {
  try { return normalizeConfig(JSON.parse(readFileSync(path, 'utf8'))) } catch { return undefined }
}

async function persistConfig(path: string, config: TypeLensConfig): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  const temporary = join(dirname(path), `.settings-${process.pid}-${randomUUID()}.tmp`)
  await writeFile(temporary, `${JSON.stringify(config, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
  await rename(temporary, path)
}

export async function handleTypeLensApi(
  runtime: TypeLensRuntime,
  settingsPath: string,
  method: string,
  body?: unknown,
): Promise<ApiResponse> {
  if (method === 'GET') return { status: 200, body: runtime.snapshot() }
  if (method === 'POST') {
    runtime.reset()
    return { status: 200, body: runtime.snapshot() }
  }
  if (method === 'PUT') {
    try {
      const validated = normalizeConfig(body)
      await persistConfig(settingsPath, validated)
      return { status: 200, body: runtime.update(validated) }
    } catch (error) {
      return { status: 400, body: { error: error instanceof Error ? error.message : String(error) } }
    }
  }
  return { status: 405, body: { error: 'method not allowed' } }
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  let total = 0
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buffer.length
    if (total > 64 * 1024) throw new Error('request body exceeds 65536 bytes')
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function sendJson(response: ServerResponse, result: ApiResponse): void {
  const body = `${JSON.stringify(result.body)}\n`
  response.writeHead(result.status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  response.end(body)
}

export function registerTypeLensHostApi(ctx: Context, runtime: TypeLensRuntime, settingsPath: string): void {
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: '/api/typelens',
      handler: async (request, response) => {
        const fetchSite = request.headers['sec-fetch-site']
        if (fetchSite !== undefined && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
          sendJson(response, { status: 403, body: { error: 'cross-site request rejected' } })
          return
        }
        try {
          const body = request.method === 'PUT' ? await readJsonBody(request) : undefined
          sendJson(response, await handleTypeLensApi(runtime, settingsPath, request.method ?? 'GET', body))
        } catch (error) {
          sendJson(response, { status: 400, body: { error: error instanceof Error ? error.message : String(error) } })
        }
      },
    }), 'typelens: local settings and health API')
  })
}
