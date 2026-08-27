import { describe, expect, it } from 'vitest'
import { recognizeFileOperation } from '../src/dsh/tool-recognition.js'

describe('recognizeFileOperation', () => {
  it.each([
    ['read', { file_path: 'src/a.ts', offset: 4, limit: 6 }, { kind: 'read', file: 'src/a.ts', range: { startLine: 4, endLine: 9 } }],
    ['write', { file_path: 'src/a.ts', content: 'x' }, { kind: 'write', file: 'src/a.ts' }],
    ['edit', { file_path: 'src/a.ts', old_string: 'a', new_string: 'b' }, { kind: 'write', file: 'src/a.ts' }],
    ['str_replace_editor', { command: 'view', path: 'src/a.ts', view_range: [2, 8] }, { kind: 'read', file: 'src/a.ts', range: { startLine: 2, endLine: 8 } }],
    ['str_replace_editor', { command: 'str_replace', path: 'src/a.ts' }, { kind: 'write', file: 'src/a.ts' }],
  ])('recognizes %s', (name, args, expected) => {
    expect(recognizeFileOperation(name, args)).toEqual(expected)
  })

  it('ignores unknown and malformed calls', () => {
    expect(recognizeFileOperation('read_image', { file_path: 'x.png' })).toBeUndefined()
    expect(recognizeFileOperation('read', { file_path: 4 })).toBeUndefined()
    expect(recognizeFileOperation('str_replace_editor', { command: 'unknown', path: 'a.ts' })).toBeUndefined()
  })
})
