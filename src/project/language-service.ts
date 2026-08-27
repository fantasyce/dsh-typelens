import { dirname } from 'node:path'
import ts from 'typescript'
import type { ProjectDiscovery } from './discovery.js'

export interface LoadedProject {
  readonly program: ts.Program
  readonly diagnostics: readonly ts.Diagnostic[]
}

export function loadProject(discovery: ProjectDiscovery, entryFile: string): LoadedProject {
  if (!discovery.configPath) {
    const program = ts.createProgram([entryFile], {
      allowJs: true, checkJs: true, strict: true, target: ts.ScriptTarget.ES2023,
      module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext,
    })
    return { program, diagnostics: [] }
  }
  const read = ts.readConfigFile(discovery.configPath, ts.sys.readFile)
  if (read.error) return { program: ts.createProgram([entryFile], {}), diagnostics: [read.error] }
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, dirname(discovery.configPath), undefined, discovery.configPath)
  const roots = parsed.fileNames.includes(entryFile) ? parsed.fileNames : [...parsed.fileNames, entryFile]
  return {
    program: ts.createProgram({
      rootNames: roots,
      options: parsed.options,
      ...(parsed.projectReferences ? { projectReferences: parsed.projectReferences } : {}),
    }),
    diagnostics: parsed.errors,
  }
}
