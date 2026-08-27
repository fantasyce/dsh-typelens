export class LruCache<K, V> {
  readonly #entries = new Map<K, V>()
  constructor(readonly capacity: number, readonly dispose?: (value: V, key: K) => void) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('capacity must be a positive integer')
  }

  get size(): number { return this.#entries.size }

  get(key: K): V | undefined {
    const value = this.#entries.get(key)
    if (value === undefined) return undefined
    this.#entries.delete(key)
    this.#entries.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    const previous = this.#entries.get(key)
    if (previous !== undefined) {
      this.#entries.delete(key)
      if (previous !== value) this.dispose?.(previous, key)
    }
    this.#entries.set(key, value)
    while (this.#entries.size > this.capacity) {
      const oldest = this.#entries.entries().next().value as [K, V] | undefined
      if (!oldest) break
      this.#entries.delete(oldest[0])
      this.dispose?.(oldest[1], oldest[0])
    }
  }

  delete(key: K): boolean {
    const value = this.#entries.get(key)
    if (value === undefined) return false
    this.#entries.delete(key)
    this.dispose?.(value, key)
    return true
  }

  clear(): void {
    for (const [key, value] of this.#entries) this.dispose?.(value, key)
    this.#entries.clear()
  }
}
