import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const archiveArg = process.argv.slice(2).find(value => value !== '--')
const archive = resolve(archiveArg ?? 'artifacts/dsh-typelens-0.1.2.tgz')
const listed = spawnSync('tar', ['-tzf', archive], { encoding: 'utf8' })
if (listed.status !== 0) throw new Error(listed.stderr || `unable to inspect ${archive}`)
const files = listed.stdout.trim().split('\n').filter(Boolean)
const required = [
  'package/package.json', 'package/cordis.patch.yml', 'package/lib/index.js',
  'package/lib/client.js', 'package/lib/types/index.d.ts', 'package/README.md',
  'package/LICENSE', 'package/SECURITY.md', 'package/CHANGELOG.md',
  'package/THIRD_PARTY_NOTICES.md',
]
for (const file of required) if (!files.includes(file)) throw new Error(`packed artifact is missing ${file}`)

const forbidden = [
  /(^|\/)src\//u, /(^|\/)tests?\//u, /(^|\/)fixtures?\//u, /node_modules/u,
  /\.map$/u, /\.log$/u, /\.env(?:\.|$)/u, /(^|\/)coverage\//u, /(^|\/)docs\/superpowers\//u,
]
for (const file of files) {
  if (!file.startsWith('package/')) throw new Error(`unexpected archive root: ${file}`)
  if (forbidden.some(pattern => pattern.test(file))) throw new Error(`forbidden packed path: ${file}`)
}

const extracted = await mkdtemp(join(tmpdir(), 'dsh-typelens-audit-'))
try {
  const unpacked = spawnSync('tar', ['-xzf', archive, '-C', extracted], { encoding: 'utf8' })
  if (unpacked.status !== 0) throw new Error(unpacked.stderr || 'unable to extract packed artifact')
  const packageRoot = join(extracted, 'package')
  const client = await readFile(join(packageRoot, 'lib/client.js'), 'utf8')
  if (!client.startsWith('window.__ModuleLoader__.load({')) throw new Error('client bundle is not a DSH module-loader factory')
  if (!client.includes('id: "dsh-typelens"')) throw new Error('client bundle has the wrong module id')
  if (/^import\s/mu.test(client)) throw new Error('client bundle contains a browser-unresolvable ESM import')
  const patterns = [/\/Users\/[^/]+\//u, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u, /\bgh[pousr]_[A-Za-z0-9]{30,}\b/u, /\bAKIA[0-9A-Z]{16}\b/u, /\b(?:sk-|npm_)[A-Za-z0-9_-]{24,}\b/u]
  async function scan(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await scan(path)
      else {
        const buffer = await readFile(path)
        if (buffer.includes(0)) continue
        if (patterns.some(pattern => pattern.test(buffer.toString('utf8')))) throw new Error(`packed content scan failed: ${path.slice(packageRoot.length + 1)}`)
      }
    }
  }
  await scan(packageRoot)
} finally {
  await rm(extracted, { recursive: true, force: true })
}

process.stdout.write(`package audit passed: ${files.length} files in ${archive}\n`)
