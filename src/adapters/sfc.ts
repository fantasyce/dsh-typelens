import type { AdaptedSource } from './typescript.js'

function scriptBlock(text: string): { text: string; offset: number } | undefined {
  const blocks = [...text.matchAll(/<script\b([^>]*)>/giu)]
  const open = blocks.find(match => !/\bcontext\s*=\s*["']module["']/iu.test(match[1] ?? '')) ?? blocks[0]
  if (!open) return undefined
  const start = (open.index ?? 0) + open[0].length
  const end = text.indexOf('</script>', start)
  if (end < 0) return undefined
  return { text: text.slice(start, end), offset: start }
}

export async function adaptSfcSource(fileName: string, text: string): Promise<AdaptedSource | undefined> {
  const lower = fileName.toLowerCase()
  const kind = lower.endsWith('.svelte') ? 'svelte' : lower.endsWith('.vue') ? 'vue' : undefined
  if (!kind) return undefined
  let block: { text: string; offset: number } | undefined
  if (kind === 'vue') {
    try {
      const { parse } = await import('@vue/compiler-sfc')
      const result = parse(text, { filename: fileName })
      const selected = result.descriptor.scriptSetup ?? result.descriptor.script
      if (selected) block = { text: selected.content, offset: selected.loc.start.offset }
    } catch { /* optional compiler unavailable or malformed input; bounded fallback below */ }
  } else {
    try { (await import('svelte/compiler')).parse(text, { filename: fileName, modern: true }) } catch { /* fallback remains fail-open */ }
  }
  block ??= scriptBlock(text)
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
