import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface Manifest {
  version?: string
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
}

describe('published package manifest', () => {
  it('publishes the documentation sync as version 0.1.2', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as Manifest

    expect(manifest.version).toBe('0.1.2')
  })

  it('does not report DSH-provided runtime peers as missing during profile installation', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as Manifest
    const peerNames = Object.keys(manifest.peerDependencies ?? {})

    expect(peerNames.length).toBeGreaterThan(0)
    expect(Object.keys(manifest.peerDependenciesMeta ?? {}).sort()).toEqual(peerNames.sort())
    for (const name of peerNames) {
      expect(manifest.peerDependenciesMeta?.[name]?.optional).toBe(true)
    }
  })
})
