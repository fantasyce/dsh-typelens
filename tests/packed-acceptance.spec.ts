import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('packed-artifact acceptance contract', () => {
  it('checks install, composition, Host API, client bundle, reload, persistence, and removal', () => {
    const script = readFileSync(new URL('../scripts/accept-packed.mjs', import.meta.url), 'utf8')
    for (const evidence of ['plugin', '--dump-config', '/api/typelens', '/plugins/dsh-typelens/client.js', 'typelens_list_types', 'typelens_lookup_type', 'typelens_explain', 'tools/post-execute', 'TS2322', 'browserBundleExecuted', 'reload', 'remove']) {
      expect(script).toContain(evidence)
    }
  })
})
