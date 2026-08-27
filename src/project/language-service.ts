import { dirname } from 'node:path'
import ts from 'typescript'
import type { AdaptedSource } from '../adapters/index.js'
import type { ProjectDiscovery } from './discovery.js'

export interface LoadedProject {
  readonly program: ts.Program
  readonly diagnostics: readonly ts.Diagnostic[]
}

function createProgram(
  rootNames: readonly string[],
  options: ts.CompilerOptions,
  projectReferences: readonly ts.ProjectReference[] | undefined,
  adapted: AdaptedSource,
  maxFileBytes: number,
): ts.Program {
  const host = ts.createCompilerHost(options)
  const originalGetSourceFile = host.getSourceFile.bind(host)
  host.fileExists = fileName => fileName === adapted.virtualFileName || ts.sys.fileExists(fileName)
  host.readFile = fileName => {
    if (fileName === adapted.virtualFileName) return adapted.text
    if (!fileName.split(/[\\/]/u).includes('node_modules') && (ts.sys.getFileSize?.(fileName) ?? 0) > maxFileBytes) return undefined
    return ts.sys.readFile(fileName)
  }
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    fileName === adapted.virtualFileName
      ? ts.createSourceFile(fileName, adapted.text, languageVersion, true)
      : originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
  return ts.createProgram({ rootNames: [...rootNames], options, host, ...(projectReferences ? { projectReferences: [...projectReferences] } : {}) })
}

export function loadProject(discovery: ProjectDiscovery, adapted: AdaptedSource, maxFileBytes = 2 * 1024 * 1024): LoadedProject {
  const entryFile = adapted.virtualFileName
  if (!discovery.configPath) {
    const options = {
      allowJs: true, checkJs: true, strict: true, target: ts.ScriptTarget.ES2023,
      module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext,
    }
    const program = createProgram([entryFile], options, undefined, adapted, maxFileBytes)
    return { program, diagnostics: [] }
  }
  const read = ts.readConfigFile(discovery.configPath, ts.sys.readFile)
  if (read.error) return { program: ts.createProgram([entryFile], {}), diagnostics: [read.error] }
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, dirname(discovery.configPath), undefined, discovery.configPath)
  const roots = parsed.fileNames.includes(entryFile) ? parsed.fileNames : [...parsed.fileNames, entryFile]
  if (roots.length > 5_000) throw new Error(`oversized-project: ${roots.length} source files exceeds the 5000-file compiler cap`)
  return { program: createProgram(roots, parsed.options, parsed.projectReferences, adapted, maxFileBytes), diagnostics: parsed.errors }
}
