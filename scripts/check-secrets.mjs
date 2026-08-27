import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

const names = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
const patterns = [
  { name: 'private key', value: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u },
  { name: 'GitHub token', value: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/u },
  { name: 'AWS access key', value: /\bAKIA[0-9A-Z]{16}\b/u },
  { name: 'OpenAI-style secret', value: /\bsk-[A-Za-z0-9_-]{24,}\b/u },
  { name: 'npm token', value: /\bnpm_[A-Za-z0-9]{30,}\b/u },
]
const hits = []
for (const name of names) {
  const buffer = await readFile(name)
  if (buffer.includes(0)) continue
  const text = buffer.toString('utf8')
  for (const pattern of patterns) if (pattern.value.test(text)) hits.push(`${name}: ${pattern.name}`)
}
if (hits.length > 0) throw new Error(`potential secrets found:\n${hits.join('\n')}`)
process.stdout.write(`secret scan passed: ${names.length} tracked files\n`)
