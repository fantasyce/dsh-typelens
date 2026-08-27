# Configuration reference

Settings are available in DSH Web under Settings → TypeLens and are persisted atomically to `$DSH_HOME/typelens/settings.json`. The file is created with mode `0600`; its parent directory is `0700`. Unknown keys and out-of-range values are rejected as a whole.

| Key | Default | Accepted range | Meaning |
|---|---:|---:|---|
| `automaticContext` | `true` | boolean | Enrich successful supported file reads. |
| `automaticDiagnostics` | `true` | boolean | Diagnose successful supported file writes and edits. |
| `contextTokenBudget` | `800` | 32–16000 | Estimated token ceiling; declarations remain complete. |
| `maxDepth` | `4` | 0–16 | Transitive declaration depth. |
| `automaticTimeoutMs` | `1500` | 100–30000 | Deadline for automatic analysis. |
| `explicitTimeoutMs` | `5000` | 100–60000 | Deadline for explicit TypeLens tools. |
| `maxFileBytes` | `2097152` | 1024–67108864 | Maximum analyzed source size. |
| `maxDiagnostics` | `40` | 1–1000 | Maximum diagnostics returned per check. |
| `maxWorkspaceServices` | `8` | 1–64 | LRU-bounded active project services. |
| `maxCachedDocuments` | `2000` | 10–100000 | Per-workspace document cache ceiling. |
| `allowOutsideWorkspace` | `false` | boolean | Permit real paths outside the session workspace. Use sparingly. |
| `allowGlobs` | `[]` | string array | Optional inclusion patterns. Empty means supported source files. |
| `denyGlobs` | safe list | string array | Exclusions applied after inclusion. |

The safe deny list contains `node_modules`, `.git`, `dist`, `build`, `.next`, `.svelte-kit`, `coverage`, `.env`, and `.env.*` patterns.

Changing settings creates a new analysis manager and disposes the old in-memory state. Reset clears manager caches, aggregate counters, and circuit-breaker history without changing settings.
