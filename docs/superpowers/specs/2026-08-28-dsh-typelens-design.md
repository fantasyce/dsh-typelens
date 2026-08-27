# DSH TypeLens Design

## Product

DSH TypeLens is a local-first DeepSeek Harness plugin that adds bounded, relevant type context to file reads and immediate diagnostics to code edits. It improves agent correctness without requiring the model to discover and call language-service tools manually.

The first public release is `0.1.0`. It targets DeepSeek Harness `0.1.1-rc.2`, Node.js 22.19 and 24, macOS and Linux. Windows remains a documented compatibility target but is not a release gate for `0.1.0` because the available acceptance host is macOS.

## Product principles

- Local analysis: TypeLens makes no outbound requests and persists no source-bearing analysis state; injected context follows the configured DSH model-provider boundary.
- Fail open for host availability: TypeLens failures never turn a successful DSH file operation into a failed operation.
- Bounded by default: every analysis has explicit time, byte, result, recursion, and token budgets.
- Observable: every injection and diagnostic result explains its source, size, duration, cache state, and any truncation or degradation.
- Native: automatic behavior uses DSH tool lifecycle hooks, while explicit tools and Web settings use supported Cordis extension surfaces.
- Honest compatibility: each release records the exact DSH versions exercised against the packed artifact.

## Supported languages and projects

The plugin supports TypeScript, TSX, JavaScript, and JSX through the TypeScript compiler services. It recognizes `tsconfig.json` and `jsconfig.json`, project references, `extends`, path aliases, package types, composite projects, and monorepo layouts. In-memory result caches are dependency-version checked before reuse.

Svelte and Vue single-file component script blocks are supported through optional adapters. When the corresponding compiler is present, it parses the component before script extraction; otherwise TypeLens uses a bounded first-instance-script fallback. Source offsets are mapped back to the component. Template semantics are outside the 0.1.0 boundary, and adapter failures never break file reads or writes.

Generated output, dependency trees, VCS metadata, secrets, and build caches are excluded by default. Users can add allow and deny globs, but TypeLens refuses paths outside the owning session workspace unless explicitly enabled.

## User flows

### Automatic read enrichment

After a successful file-reading tool call, TypeLens recognizes the resolved file path and requested range. It computes only the symbols referenced by the visible range, resolves their definitions and bounded transitive dependencies, then appends one structured `typelens_context` block through `tools/post-execute.additionalContexts`.

The original tool result is not rewritten. Duplicate type context already visible in the same agent step is removed. If no useful types exist or the budget is exhausted before one complete signature fits, no context is appended and the reason is observable.

### Automatic edit diagnostics

After a successful file write or edit, TypeLens invalidates affected project caches and runs incremental syntactic and semantic diagnostics. It reports new errors in the changed file first, followed by a bounded number of project errors affected by the change. Diagnostics are appended as additional context and do not replace the successful edit result.

Diagnostics are deduplicated against the previous TypeLens result for the session. Unchanged pre-existing project errors are summarized rather than repeatedly injected.

### Explicit tools

- `typelens_lookup_type`: resolve a named symbol, optionally scoped to a file, with definition locations and usages.
- `typelens_list_types`: list exported or local symbols with kind and location, filtered by query and kind.
- `typelens_check`: run bounded diagnostics for a file or project.
- `typelens_explain`: show the effective project, configuration, adapter, budgets, cache state, and last degradation reason for a file.

All paths returned to the model are workspace-relative. Tool schemas expose bounded limits; they do not accept arbitrary compiler flags or commands.

### Web management

The DSH Web settings surface exposes:

- enable/disable automatic read enrichment and edit diagnostics independently;
- language and adapter status;
- context token budget, import depth, timeout, maximum diagnostics, allow and deny globs;
- recent aggregate counters for requests, injections, skipped analyses, cache hits, timeouts, and failures;
- a reset-cache action and a read-only compatibility/health report.

Settings are validated before persistence. Invalid settings retain the last valid configuration and return field-level errors.

## Architecture

The repository is one npm package with focused modules:

- `plugin`: Cordis lifecycle, configuration, tool registration, and DSH compatibility adapter.
- `interception`: recognizes supported file tool calls/results and produces additional contexts.
- `project`: discovers configuration, builds compiler programs, validates dependency versions before cache reuse, and bounds cache lifetime.
- `analysis`: extracts referenced symbols, ranks type declarations, renders context, and calculates diagnostics deltas.
- `adapters`: plain TypeScript plus optional Svelte and Vue virtual-document adapters.
- `tools`: explicit model-facing tools with stable schemas.
- `telemetry`: local aggregate metrics and health state; never records source text, prompts, file contents, or credentials.
- `client`: Web settings and health panel loaded through the DSH client bundle.

The DSH-specific adapter is kept thin. Domain modules depend on local interfaces rather than DSH types, allowing deterministic unit tests and future DSH compatibility updates without rewriting the analysis engine.

## Data and privacy

TypeLens persists only validated user settings. Cache entries, project graphs, diagnostics, and metrics are in memory and are released on plugin unload. No source code, type declarations, prompts, session transcripts, or file contents are written by the plugin. Context and diagnostics appended to an agent step are model-visible and travel through the model provider selected in DSH; TypeLens itself opens no network connection.

Logs contain workspace-relative paths, stable reason codes, counts, durations, and hashes only. Error messages are sanitized before logging.

## Resource bounds and availability

Defaults:

- context budget: 800 estimated tokens;
- transitive type depth: 4;
- cooperative analysis deadline: 1,500 ms for automatic enrichment and 5,000 ms for explicit checks, plus file, source-count, result, and cache caps around synchronous compiler work;
- maximum source file size: 2 MiB;
- maximum diagnostics: 20 for the changed file and 20 across other files;
- maximum active workspace services: 8 with least-recently-used eviction;
- maximum cached documents per workspace: 2,000;
- circuit breaker: five operational failures in 60 seconds pauses automatic analysis for 30 seconds, while explicit health/explain calls remain available.

Timeout, cancellation, adapter failure, malformed configuration, missing compiler dependency, unsupported language, or oversized input all return stable degradation codes. Automatic hooks fail open; explicit tools return a structured error without throwing an unclassified exception.

## Type-context ranking

Candidates are ranked in this order:

1. function and method signatures directly referenced by the visible code;
2. parameter and return types of those signatures;
3. directly referenced interfaces, aliases, enums, and public class surfaces;
4. transitive dependencies needed to understand the preceding declarations;
5. other local declarations only when budget remains.

Rendering always emits complete declarations. A declaration that cannot fit is skipped rather than cut mid-syntax. Cycles are detected by stable symbol identity. Equivalent rendered declarations are included once.

## Packaging and installation

The published artifact contains built ESM, declarations, the Cordis bundle patch, the Web client bundle, license, README, and package metadata. It excludes source maps containing absolute paths, tests, fixtures, caches, reports, local settings, and development checkouts.

The package declares its DSH bundle in `package.json` and requires no install-time lifecycle script. The GitHub Release tarball is the supported 0.1.0 install source. Git-tag installs are intentionally unsupported because generated build output is not committed; the short package-name command becomes available after npm publication.

## Verification and release gates

Release requires all of the following against the final packed bytes:

- unit and property tests for ranking, budgets, path containment, diagnostic deltas, caching, invalidation, adapters, settings, and circuit breaking;
- TypeScript typecheck, lint, formatting, dependency audit, secret scan, and package-content audit;
- real Cordis Loader boot/unload/reload smoke tests;
- isolated DSH profile installation from the generated tarball, config reconciliation, plugin discovery, explicit-tool calls, and clean removal;
- fixture acceptance for TS, TSX, JS, JSX, Svelte, Vue, monorepo references, path aliases, malformed configs, large files, cycles, cancellation, timeouts, and concurrency;
- deterministic scripted-model DSH sessions proving automatic read context and edit diagnostics;
- a real configured-model comparison on representative coding tasks when credentials are available, reported separately from keyless gates;
- macOS installed-runtime acceptance and GitHub CI on Linux with Node 22.19 and 24;
- final residue observation showing no task-owned servers, temporary profiles, unpack directories, test workspaces, or attributed ports remain;
- README, Chinese guide, configuration reference, troubleshooting, security policy, changelog, license, compatibility report, checksums, Git tag, and GitHub Release.

No release claim may use source tests as proof of packed-artifact or installed-runtime behavior.

## Out of scope for 0.1.0

- remote indexing or hosted analysis;
- autonomous code modification;
- replacing DSH's LSP tools;
- languages without TypeScript-compatible source models;
- Windows as a release-blocking platform;
- collecting source-bearing analytics.

These exclusions preserve a coherent and reliable product; they are not placeholders for required first-release behavior.
