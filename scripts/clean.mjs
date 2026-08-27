import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const target = resolve(process.cwd(), 'lib')
if (target === process.cwd() || !target.endsWith('/lib')) throw new Error(`refusing unsafe clean target: ${target}`)
await rm(target, { recursive: true, force: true })
