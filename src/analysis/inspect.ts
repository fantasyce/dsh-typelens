import { isAbsolute, relative, sep } from 'node:path'
import ts from 'typescript'

export interface InspectedType {
  readonly name: string
  readonly kind: string
  readonly file: string
  readonly line: number
  readonly declaration: string
  readonly usages: readonly { readonly file: string; readonly line: number; readonly character: number }[]
}

function localPath(workspace: string, file: string): string | undefined {
  const value = relative(workspace, file)
  if (value === '..' || value.startsWith(`..${sep}`) || isAbsolute(value) || value.split(sep).includes('node_modules')) return undefined
  return value.split(sep).join('/')
}

function namedDeclaration(node: ts.Node): node is ts.NamedDeclaration & { name: ts.Identifier } {
  return (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isClassDeclaration(node)
    || ts.isEnumDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node))
    && node.name !== undefined && ts.isIdentifier(node.name)
}

export function inspectTypes(program: ts.Program, workspace: string, options: {
  readonly query?: string
  readonly kind?: string
  readonly exact?: boolean
  readonly limit: number
}): readonly InspectedType[] {
  const query = options.query?.trim().toLocaleLowerCase() ?? ''
  const rows: InspectedType[] = []
  for (const source of program.getSourceFiles()) {
    const file = localPath(workspace, source.fileName)
    if (!file) continue
    const visit = (node: ts.Node): void => {
      if (rows.length >= options.limit) return
      if (namedDeclaration(node)) {
        const name = node.name.text
        const kind = ts.SyntaxKind[node.kind].replace(/Declaration$/u, '').toLocaleLowerCase()
        const matches = !query || (options.exact ? name.toLocaleLowerCase() === query : name.toLocaleLowerCase().includes(query))
        if (matches && (!options.kind || kind === options.kind.toLocaleLowerCase())) {
          const position = source.getLineAndCharacterOfPosition(node.name.getStart(source))
          const usages: Array<{ file: string; line: number; character: number }> = []
          for (const candidateSource of program.getSourceFiles()) {
            const usageFile = localPath(workspace, candidateSource.fileName)
            if (!usageFile) continue
            const scan = (candidate: ts.Node): void => {
              if (usages.length >= 100) return
              if (ts.isIdentifier(candidate) && candidate.text === name && candidate !== node.name) {
                const at = candidateSource.getLineAndCharacterOfPosition(candidate.getStart(candidateSource))
                usages.push({ file: usageFile, line: at.line + 1, character: at.character + 1 })
              }
              ts.forEachChild(candidate, scan)
            }
            scan(candidateSource)
          }
          rows.push({ name, kind, file, line: position.line + 1, declaration: node.getText(source), usages })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name) || a.file.localeCompare(b.file)).slice(0, options.limit)
}
