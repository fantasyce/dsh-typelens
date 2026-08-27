import { access, realpath } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'

export interface ProjectDiscovery {
  readonly configPath: string | undefined
  readonly projectRoot: string
  readonly implicit: boolean
}

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true } catch { return false }
}

export async function discoverProject(workspace: string, file: string): Promise<ProjectDiscovery> {
  const root = await realpath(workspace)
  let cursor: string
  try { cursor = dirname(await realpath(file)) } catch { cursor = await realpath(dirname(file)) }
  while (true) {
    for (const name of ['tsconfig.json', 'jsconfig.json']) {
      const configPath = join(cursor, name)
      if (await exists(configPath)) return Object.freeze({ configPath, projectRoot: cursor, implicit: false })
    }
    if (cursor === root) break
    const parent = dirname(cursor)
    const rel = relative(root, parent)
    if (parent === cursor || rel === '..' || rel.startsWith(`..${sep}`)) break
    cursor = parent
  }
  return Object.freeze({ configPath: undefined, projectRoot: root, implicit: true })
}
