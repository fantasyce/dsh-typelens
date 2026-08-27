import { adaptSfcSource } from './sfc.js'
import { adaptPlainSource, type AdaptedSource } from './typescript.js'

export type { AdaptedSource, SourceLanguage } from './typescript.js'

export async function adaptSource(fileName: string, text: string): Promise<AdaptedSource | undefined> {
  return adaptPlainSource(fileName, text) ?? adaptSfcSource(fileName, text)
}
