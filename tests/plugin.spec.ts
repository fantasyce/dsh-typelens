import { describe, expect, it, vi } from 'vitest'
import { apply, inject, name } from '../src/index.js'

describe('DSH plugin entry', () => {
  it('declares stable identity and mounts four tools plus a post-execute hook', () => {
    const tools: string[] = []
    const events: string[] = []
    const ctx = {
      tools: { register: (definition: { name: string }) => { tools.push(definition.name); return () => {} } },
      on: (event: string) => { events.push(event); return () => {} },
      effect: vi.fn(),
      inject: vi.fn(),
    }
    apply(ctx as never, {})
    expect(name).toBe('typelens')
    expect(inject).toEqual(['tools'])
    expect(tools).toEqual(['typelens_lookup_type', 'typelens_list_types', 'typelens_check', 'typelens_explain'])
    expect(events).toEqual(['tools/post-execute'])
  })
})
