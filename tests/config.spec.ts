import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, normalizeConfig } from '../src/config.js'

describe('normalizeConfig', () => {
  it('returns complete immutable defaults', () => {
    const config = normalizeConfig(undefined)
    expect(config).toEqual(DEFAULT_CONFIG)
    expect(Object.isFrozen(config)).toBe(true)
    expect(Object.isFrozen(config.denyGlobs)).toBe(true)
  })

  it.each([
    ['contextTokenBudget', 31], ['contextTokenBudget', 16_001],
    ['maxDepth', -1], ['maxDepth', 17],
    ['automaticTimeoutMs', 99], ['explicitTimeoutMs', 60_001],
    ['maxFileBytes', 1023], ['maxWorkspaceServices', 0],
  ])('rejects out-of-bound %s', (key, value) => {
    expect(() => normalizeConfig({ [key]: value })).toThrow(key)
  })

  it('normalizes and deduplicates globs', () => {
    const config = normalizeConfig({ allowGlobs: [' src/** ', 'src/**'], denyGlobs: ['tmp/**', ' tmp/** '] })
    expect(config.allowGlobs).toEqual(['src/**'])
    expect(config.denyGlobs).toEqual(['tmp/**'])
  })

  it('rejects unknown keys instead of silently accepting a misspelling', () => {
    expect(() => normalizeConfig({ contextTokenBudegt: 500 })).toThrow('unknown configuration key')
  })
})
