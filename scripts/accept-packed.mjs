import { spawn, spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2).filter(value => value !== '--')
const archive = resolve(args[0] ?? 'artifacts/dsh-typelens-0.1.0.tgz')
const root = args[1] ? resolve(args[1]) : await mkdtemp(join(tmpdir(), 'dsh-typelens-packed-'))
const home = resolve(root, 'home')
const evidence = resolve(root, 'evidence')
await mkdir(home, { recursive: true, mode: 0o700 })
await mkdir(evidence, { recursive: true, mode: 0o700 })
const env = { ...process.env, DSH_HOME: home, NO_COLOR: '1' }

function command(args) {
  const result = spawnSync('dsh', args, { env, encoding: 'utf8', timeout: 180_000 })
  const combined = `${result.stdout ?? ''}${result.stderr ?? ''}`
  if (result.status !== 0) throw new Error(`dsh ${args.join(' ')} failed (${result.status}):\n${combined}`)
  return combined
}

async function freePort() {
  return await new Promise((resolvePort, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') return reject(new Error('unable to allocate a local port'))
      const port = address.port
      server.close(error => error ? reject(error) : resolvePort(port))
    })
  })
}

async function waitFor(url, child) {
  const deadline = Date.now() + 60_000
  let last = 'not attempted'
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`DSH Web exited before readiness (${child.exitCode})`)
    try {
      const response = await fetch(url)
      if (response.ok) return response
      last = `HTTP ${response.status}`
    } catch (error) { last = error instanceof Error ? error.message : String(error) }
    await new Promise(resolveWait => setTimeout(resolveWait, 200))
  }
  throw new Error(`timed out waiting for ${url}: ${last}`)
}

async function bootAndProbe(label) {
  const port = await freePort()
  const child = spawn('dsh', ['--profile', 'web', '--no-open', '--host', '127.0.0.1', '--port', String(port)], {
    env, stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', chunk => { output += chunk.toString() })
  child.stderr.on('data', chunk => { output += chunk.toString() })
  try {
    const response = await waitFor(`http://127.0.0.1:${port}/api/typelens`, child)
    const snapshot = await response.json()
    if (snapshot.product !== 'DSH TypeLens' || snapshot.version !== '0.1.0' || snapshot.analysisLocal !== true || snapshot.externalNetworkRequests !== false) {
      throw new Error(`unexpected TypeLens snapshot: ${JSON.stringify(snapshot)}`)
    }
    const client = await (await waitFor(`http://127.0.0.1:${port}/plugins/dsh-typelens/client.js`, child)).text()
    if (!client.startsWith('window.__ModuleLoader__.load({')) throw new Error('served client is not a DSH module bundle')
    const updated = { ...snapshot.config, contextTokenBudget: 1200 }
    const put = await fetch(`http://127.0.0.1:${port}/api/typelens`, {
      method: 'PUT', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }, body: JSON.stringify(updated),
    })
    if (!put.ok || (await put.json()).config.contextTokenBudget !== 1200) throw new Error('validated settings update failed')
    await writeFile(resolve(evidence, `${label}-snapshot.json`), `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 })
  } finally {
    child.kill('SIGTERM')
    await Promise.race([
      new Promise(resolveExit => child.once('exit', resolveExit)),
      new Promise(resolveExit => setTimeout(() => { child.kill('SIGKILL'); resolveExit() }, 10_000)),
    ])
    await writeFile(resolve(evidence, `${label}-web.log`), output, { mode: 0o600 })
  }
}

async function exerciseInstalledPlugin() {
  const profile = resolve(home, 'profiles/web')
  const workspace = resolve(root, 'fixture-workspace')
  await mkdir(workspace, { recursive: true })
  await writeFile(resolve(workspace, 'types.ts'), 'export interface User { id: string; name: string }\n')
  await writeFile(resolve(workspace, 'main.ts'), 'import type { User } from "./types"\nexport const user: User = { id: "1", name: "Ada" }\n')
  const runner = resolve(profile, '.typelens-packed-acceptance.mjs')
  await writeFile(runner, `
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { apply } from 'dsh-typelens'

const workspace = ${JSON.stringify(workspace)}
const definitions = []
let postExecute
const disposers = []
const ctx = {
  tools: { register(definition) { definitions.push(definition); return () => {} } },
  on(event, handler) { if (event === 'tools/post-execute') postExecute = handler; return () => {} },
  inject() {},
  effect(factory) { const dispose = factory(); if (typeof dispose === 'function') disposers.push(dispose) },
}
apply(ctx, {})
const names = definitions.map(item => item.name)
const expected = ['typelens_lookup_type', 'typelens_list_types', 'typelens_check', 'typelens_explain']
if (JSON.stringify(names) !== JSON.stringify(expected)) throw new Error('unexpected installed tools: ' + JSON.stringify(names))
const execution = { signal: new AbortController().signal, agent: { session: { header: { cwd: workspace, id: 'packed' } } } }
const listed = await definitions.find(item => item.name === 'typelens_list_types').execute({ file_path: 'main.ts' }, execution)
if (!listed.text.includes('interface User')) throw new Error('installed explicit type lookup missed User')
const lookedUp = await definitions.find(item => item.name === 'typelens_lookup_type').execute({ file_path: 'main.ts', name: 'User' }, execution)
if (!lookedUp.text.includes('Usages') || !lookedUp.text.includes('types.ts')) throw new Error('installed symbol lookup missed definition/usages')
const explained = await definitions.find(item => item.name === 'typelens_explain').execute({ file_path: 'main.ts' }, execution)
if (!explained.text.includes('projectRoot') || !explained.text.includes('budgets')) throw new Error('installed explain missed file details')
const readDecision = await postExecute({ ...execution, name: 'read', arguments: { file_path: 'main.ts' } }, { isError: false }, async () => ({ kind: 'accept' }))
const readText = readDecision.additionalContexts?.[0]?.content?.[0]?.text ?? ''
if (!readText.includes('interface User')) throw new Error('installed read hook missed type context')
await writeFile(workspace + '/main.ts', 'import type { User } from "./types"\\nexport const user: User = { id: 1, name: "Ada" }\\n')
const editDecision = await postExecute({ ...execution, name: 'edit', arguments: { file_path: 'main.ts' } }, { isError: false }, async () => ({ kind: 'accept' }))
const diagnosticText = editDecision.additionalContexts?.[0]?.content?.[0]?.text ?? ''
if (!diagnosticText.includes('TS2322')) throw new Error('installed edit hook missed TS2322')
const checked = await definitions.find(item => item.name === 'typelens_check').execute({ file_path: 'main.ts' }, execution)
if (!checked.text.includes('TS2322')) throw new Error('installed explicit check missed TS2322')
const clientCode = await readFile(new URL('./node_modules/dsh-typelens/lib/client.js', import.meta.url), 'utf8')
let loaded
runInNewContext(clientCode, { window: { __ModuleLoader__: { load(value) { loaded = value } } } })
if (!loaded || loaded.id !== 'dsh-typelens') throw new Error('client factory did not register')
const client = loaded.factory(createRequire(import.meta.url))
const sections = []
client.apply({
  effect(factory) { return factory() },
  locale: { register() { return () => {} }, bind() { return key => key } },
  slots: { inject(_name, factory) { return factory() }, register(options) { sections.push(options); return () => {} } },
})
if (!sections.some(section => section.name === 'settings.section' && section.id === 'typelens' && section.locale === 'typelens')) throw new Error('client settings section did not execute')
for (const dispose of disposers.reverse()) dispose()
process.stdout.write(JSON.stringify({ tools: names, readContext: true, editDiagnostic: 'TS2322', explicitCheck: true, lookupUsages: true, explain: true, browserBundleExecuted: true }))
`, { mode: 0o600 })
  const result = spawnSync(process.execPath, [runner], { cwd: profile, env, encoding: 'utf8', timeout: 60_000 })
  if (result.status !== 0) throw new Error(`installed plugin execution failed:\n${result.stdout ?? ''}${result.stderr ?? ''}`)
  const parsed = JSON.parse(result.stdout)
  await writeFile(resolve(evidence, 'installed-execution.json'), `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 })
}

command(['plugin', '--profile', 'web', 'add', archive])
const dump = command(['--profile', 'web', '--dump-config'])
if (!dump.includes('id: typelens') || !dump.includes('name: dsh-typelens')) throw new Error('composed profile does not contain TypeLens')
await writeFile(resolve(evidence, 'dump-config.txt'), dump, { mode: 0o600 })
await exerciseInstalledPlugin()
await bootAndProbe('first-boot')
await bootAndProbe('reload')

const settings = JSON.parse(await readFile(resolve(home, 'typelens/settings.json'), 'utf8'))
if (settings.contextTokenBudget !== 1200) throw new Error('settings did not persist across reload')
command(['plugin', '--profile', 'web', 'remove', 'dsh-typelens'])
const removed = command(['--profile', 'web', '--dump-config'])
if (removed.includes('id: typelens')) throw new Error('TypeLens row remained after plugin removal')
await rm(home, { recursive: true, force: true })
await rm(resolve(root, 'fixture-workspace'), { recursive: true, force: true })
process.stdout.write(`packed acceptance passed: ${archive}\nevidence: ${evidence}\n`)
