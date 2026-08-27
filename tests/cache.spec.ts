import { describe, expect, it } from 'vitest'
import { LruCache } from '../src/cache/lru.js'

describe('LruCache', () => {
  it('evicts the least recently used value and disposes it once', () => {
    const disposed: string[] = []
    const cache = new LruCache<string, string>(2, value => disposed.push(value))
    cache.set('a', 'A')
    cache.set('b', 'B')
    expect(cache.get('a')).toBe('A')
    cache.set('c', 'C')
    expect(cache.get('b')).toBeUndefined()
    expect(disposed).toEqual(['B'])
  })

  it('clears all retained values', () => {
    const disposed: string[] = []
    const cache = new LruCache<string, string>(2, value => disposed.push(value))
    cache.set('a', 'A'); cache.set('b', 'B'); cache.clear()
    expect(disposed.sort()).toEqual(['A', 'B'])
    expect(cache.size).toBe(0)
  })
})
