import ts from 'typescript'
import { isAbsolute, relative, sep } from 'node:path'
import type { TypeLensConfig } from '../config.js'
import type { ContextAnalysis, SourceRange } from '../types.js'

interface Candidate {
  readonly key: string
  readonly text: string
  readonly priority: number
  readonly dependencies: readonly ts.Symbol[]
}

function lineBounds(source: ts.SourceFile, range?: SourceRange): readonly [number, number] {
  const startLine = Math.max(1, range?.startLine ?? 1)
  const endLine = Math.max(startLine, range?.endLine ?? source.getLineAndCharacterOfPosition(source.end).line + 1)
  const start = source.getPositionOfLineAndCharacter(Math.min(startLine - 1, source.getLineAndCharacterOfPosition(source.end).line), 0)
  const endLineIndex = Math.min(endLine, source.getLineAndCharacterOfPosition(source.end).line + 1)
  const end = endLineIndex >= source.getLineAndCharacterOfPosition(source.end).line + 1
    ? source.end
    : source.getPositionOfLineAndCharacter(endLineIndex, 0)
  return [start, end]
}

function resolveAlias(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol {
  return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
}

function renderDeclaration(checker: ts.TypeChecker, declaration: ts.Declaration): string | undefined {
  if (ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration) || ts.isMethodSignature(declaration)) {
    const signature = checker.getSignatureFromDeclaration(declaration)
    const name = declaration.name && ts.isIdentifier(declaration.name) ? declaration.name.text : 'anonymous'
    return signature ? `function ${name}${checker.signatureToString(signature, declaration, ts.TypeFormatFlags.NoTruncation)};` : undefined
  }
  if (ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration) || ts.isEnumDeclaration(declaration)) {
    return declaration.getText(declaration.getSourceFile())
  }
  if (ts.isClassDeclaration(declaration)) {
    const name = declaration.name?.text ?? 'AnonymousClass'
    const members = declaration.members
      .filter(member => !(ts.canHaveModifiers(member) && ts.getModifiers(member)?.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword)))
      .map(member => member.getText(declaration.getSourceFile()).replace(/\{[\s\S]*\}$/u, ';'))
    return `class ${name} {\n${members.map(member => `  ${member}`).join('\n')}\n}`
  }
  if (ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)) {
    return `const ${declaration.name.text}: ${checker.typeToString(checker.getTypeAtLocation(declaration), declaration, ts.TypeFormatFlags.NoTruncation)};`
  }
  return undefined
}

function symbolCandidate(checker: ts.TypeChecker, symbol: ts.Symbol, workspace: string): Candidate | undefined {
  const resolved = resolveAlias(checker, symbol)
  const declaration = resolved.declarations?.find(item => {
    const file = item.getSourceFile().fileName
    const rel = relative(workspace, file)
    const contained = rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
    return contained && !file.split(sep).includes('node_modules')
  })
  if (!declaration) return undefined
  const text = renderDeclaration(checker, declaration)
  if (!text) return undefined
  const dependencies: ts.Symbol[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isTypeReferenceNode(node) || ts.isExpressionWithTypeArguments(node)) {
      const target = ts.isTypeReferenceNode(node) ? node.typeName : node.expression
      const dependency = checker.getSymbolAtLocation(target)
      if (dependency) dependencies.push(resolveAlias(checker, dependency))
    }
    ts.forEachChild(node, visit)
  }
  visit(declaration)
  const priority = ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration) ? 0
    : ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration) ? 1 : 2
  return { key: `${declaration.getSourceFile().fileName}:${declaration.pos}:${resolved.name}`, text, priority, dependencies }
}

export function buildTypeContext(
  program: ts.Program,
  source: ts.SourceFile,
  workspace: string,
  config: TypeLensConfig,
  range?: SourceRange,
): Omit<ContextAnalysis, 'file' | 'durationMs' | 'cacheHit'> {
  const checker = program.getTypeChecker()
  const [start, end] = lineBounds(source, range)
  const roots: ts.Symbol[] = []
  const visitVisible = (node: ts.Node): void => {
    if (node.end < start || node.pos > end) return
    if (ts.isIdentifier(node) && node.pos >= start && node.end <= end) {
      const symbol = checker.getSymbolAtLocation(node)
      if (symbol) roots.push(resolveAlias(checker, symbol))
    }
    ts.forEachChild(node, visitVisible)
  }
  visitVisible(source)

  const candidates = new Map<string, Candidate>()
  const seenSymbols = new Set<ts.Symbol>()
  const queue = roots.map(symbol => ({ symbol, depth: 0 }))
  while (queue.length > 0) {
    const current = queue.shift()!
    if (seenSymbols.has(current.symbol) || current.depth > config.maxDepth) continue
    seenSymbols.add(current.symbol)
    const candidate = symbolCandidate(checker, current.symbol, workspace)
    if (!candidate) continue
    candidates.set(candidate.key, candidate)
    for (const dependency of candidate.dependencies) queue.push({ symbol: dependency, depth: current.depth + 1 })
  }

  const ordered = [...candidates.values()].sort((a, b) => a.priority - b.priority || a.key.localeCompare(b.key))
  const header = '<typelens_context analysis_origin="local">\n'
  const footer = '</typelens_context>\n'
  const limit = config.contextTokenBudget * 4
  let body = ''
  let declarations = 0
  let truncated = false
  for (const candidate of ordered) {
    const block = `${candidate.text.trim()}\n\n`
    if ((header.length + body.length + block.length + footer.length) > limit) { truncated = true; continue }
    body += block
    declarations += 1
  }
  const text = declarations > 0 ? `${header}${body}${footer}` : ''
  return {
    kind: 'context', text, declarations, estimatedTokens: Math.ceil(text.length / 4), truncated,
  }
}
