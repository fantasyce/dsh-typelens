import { extname } from 'node:path'

export type SourceLanguage = 'ts' | 'tsx' | 'js' | 'jsx' | 'svelte' | 'vue'

export interface AdaptedSource {
  readonly kind: 'plain' | 'svelte' | 'vue'
  readonly language: SourceLanguage
  readonly fileName: string
  readonly virtualFileName: string
  readonly text: string
  readonly sourceOffset: number
}

const PLAIN = new Set(['.ts', '.tsx', '.js', '.jsx'])

export function adaptPlainSource(fileName: string, text: string): AdaptedSource | undefined {
  const extension = extname(fileName).toLowerCase()
  if (!PLAIN.has(extension)) return undefined
  return Object.freeze({
    kind: 'plain',
    language: extension.slice(1) as SourceLanguage,
    fileName,
    virtualFileName: fileName,
    text,
    sourceOffset: 0,
  })
}
