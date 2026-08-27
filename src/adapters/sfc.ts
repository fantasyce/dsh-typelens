import type { AdaptedSource } from './typescript.js'

function scriptBlock(text: string): { text: string; offset: number } | undefined {
  const open = /<script\b[^>]*>/i.exec(text)
  if (!open) return undefined
  const start = (open.index ?? 0) + open[0].length
  const end = text.indexOf('</script>', start)
  if (end < 0) return undefined
  return { text: text.slice(start, end), offset: start }
}

export function adaptSfcSource(fileName: string, text: string): AdaptedSource | undefined {
  const lower = fileName.toLowerCase()
  const kind = lower.endsWith('.svelte') ? 'svelte' : lower.endsWith('.vue') ? 'vue' : undefined
  if (!kind) return undefined
  const block = scriptBlock(text)
  if (!block) return undefined
  return Object.freeze({
    kind,
    language: kind,
    fileName,
    virtualFileName: `${fileName}.ts`,
    text: block.text,
    sourceOffset: block.offset,
  })
}
