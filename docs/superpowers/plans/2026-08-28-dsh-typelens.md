# DSH TypeLens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, validate, and release a local-first DSH plugin that automatically injects relevant type context after reads and bounded diagnostics after edits.

**Architecture:** A DSH-independent TypeScript analysis engine sits behind a thin Cordis adapter. The adapter recognizes file tools, registers four explicit tools, exposes local health/configuration, and fails open for automatic behavior. A small Web client registers a native Settings section through supported client slots.

**Tech Stack:** TypeScript 5.9, TypeScript Language Service, Cordis/DSH 0.1.1-rc.2, React 18, Vitest, tsdown, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-28-dsh-typelens-design.md`

## Global Constraints

- Target DSH `0.1.1-rc.2`, Node.js 22.19 and 24, macOS and Linux.
- Never send source or type data over the network and never persist source-bearing caches.
- Automatic hooks fail open and may add context only; they never replace a successful tool result.
- Every analysis is bounded by workspace containment, file size, time, result count, recursion depth, and token budget.
- The published package has no install-time scripts.

---

### Task 1: Package skeleton and validated configuration

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsdown.config.ts`, `vitest.config.ts`, `.gitignore`, `LICENSE`
- Create: `src/config.ts`, `src/types.ts`
- Test: `tests/config.spec.ts`

**Interfaces:**
- Produces: `normalizeConfig(input: unknown): TypeLensConfig`, `DEFAULT_CONFIG`, shared result and health types.

- [ ] Write failing tests proving defaults, invalid bounds, immutable normalized output, allow/deny glob normalization, and unknown-key rejection.
- [ ] Run `pnpm vitest run tests/config.spec.ts`; expect failure because `src/config.ts` does not exist.
- [ ] Implement schemas and package build configuration with exact DSH peer versions.
- [ ] Re-run the focused test, typecheck, and build; expect success.
- [ ] Commit package foundation.

### Task 2: Workspace containment, project discovery, and adapters

**Files:**
- Create: `src/path-policy.ts`, `src/project/discovery.ts`
- Create: `src/adapters/typescript.ts`, `src/adapters/sfc.ts`, `src/adapters/index.ts`
- Test: `tests/path-policy.spec.ts`, `tests/discovery.spec.ts`, `tests/adapters.spec.ts`
- Fixtures: `tests/fixtures/projects/**`

**Interfaces:**
- Consumes: `TypeLensConfig`.
- Produces: `resolveWorkspaceFile`, `discoverProject`, `SourceAdapter`, `adaptSource`.

- [ ] Write failing containment tests for traversal, symlinks, outside paths, default excludes, and allowed source files.
- [ ] Implement realpath-based containment and deterministic project-config discovery.
- [ ] Write failing adapter tests for TS/TSX/JS/JSX and script offsets in Svelte/Vue files.
- [ ] Implement plain and SFC adapters with optional compiler detection and stable degradation codes.
- [ ] Run focused tests and commit.

### Task 3: TypeScript project service and bounded context engine

**Files:**
- Create: `src/project/language-service.ts`, `src/project/manager.ts`, `src/cache/lru.ts`
- Create: `src/analysis/references.ts`, `src/analysis/render.ts`, `src/analysis/context.ts`
- Test: `tests/language-service.spec.ts`, `tests/context.spec.ts`, `tests/cache.spec.ts`

**Interfaces:**
- Produces: `ProjectManager.analyzeContext(request, signal)`, `ContextAnalysis`, `ProjectHandle`.

- [ ] Write a failing test where a partial read referencing `User` produces its complete imported declaration but not unrelated declarations.
- [ ] Implement an in-memory Language Service host over real fixture files with versioned snapshots.
- [ ] Write failing tests for ranking, transitive depth, cycles, complete-declaration token fitting, deduplication, aliases, project references, and LRU eviction.
- [ ] Implement symbol collection, declaration rendering, token estimation, timeout/cancellation, and cache invalidation.
- [ ] Run focused and aggregate tests; commit.

### Task 4: Incremental diagnostics and availability controls

**Files:**
- Create: `src/analysis/diagnostics.ts`, `src/availability/circuit-breaker.ts`, `src/metrics.ts`
- Test: `tests/diagnostics.spec.ts`, `tests/circuit-breaker.spec.ts`, `tests/metrics.spec.ts`

**Interfaces:**
- Produces: `ProjectManager.analyzeDiagnostics`, `DiagnosticDeltaTracker`, `CircuitBreaker`, `MetricsStore`.

- [ ] Write failing tests proving changed-file-first ordering, new-error deltas, bounded project errors, and stable error codes.
- [ ] Implement diagnostic formatting and per-session fingerprints without persisting source text.
- [ ] Write failing tests for five failures in sixty seconds, thirty-second pause, recovery, and explicit-operation bypass.
- [ ] Implement the circuit breaker and aggregate source-free metrics.
- [ ] Run focused tests and commit.

### Task 5: DSH host plugin, automatic hooks, and explicit tools

**Files:**
- Create: `src/dsh/tool-recognition.ts`, `src/dsh/format.ts`, `src/tools.ts`, `src/index.ts`
- Create: `cordis.patch.yml`
- Test: `tests/tool-recognition.spec.ts`, `tests/hooks.spec.ts`, `tests/tools.spec.ts`, `tests/loader.spec.ts`

**Interfaces:**
- Consumes: `ProjectManager`, `CircuitBreaker`, `MetricsStore`.
- Produces: Cordis `apply(ctx, config)`, four `typelens_*` tools, and `tools/post-execute` enrichment.

- [ ] Write failing table tests for DSH fs read/edit/write tool names and argument shapes; unknown tools must be ignored.
- [ ] Implement conservative tool recognition and workspace-relative context formatting.
- [ ] Write failing integration tests proving successful reads gain context, edits gain diagnostics, failures and unsupported inputs call downstream unchanged, and internal exceptions fail open.
- [ ] Register explicit tools with bounded JSON schemas and structured content responses.
- [ ] Boot the packed plugin through the real Cordis Loader, unload, and reload; commit.

### Task 6: Native Web settings and health surface

**Files:**
- Create: `src/host-api.ts`, `src/client/index.tsx`, `src/client/TypeLensSettings.tsx`, `src/client/styles.css`, `src/client/locales.ts`
- Test: `tests/host-api.spec.ts`, `tests/client.spec.tsx`

**Interfaces:**
- Produces: local Host API for validated settings, cache reset, health and counters; Web `settings.section` registration.

- [ ] Write failing Host API tests for read, validated update, rejected update preserving prior config, health, and cache reset.
- [ ] Implement source-free Host state and API methods using supported DSH extension points.
- [ ] Write failing browser tests for English/Chinese labels, independent toggles, numeric bounds, degradation display, counters, save errors, and reset confirmation.
- [ ] Implement the React settings page with semantic controls and keyboard-accessible status output.
- [ ] Build the client bundle, run browser tests, and commit.

### Task 7: Packed-artifact acceptance, documentation, and release

**Files:**
- Create: `scripts/accept-packed.mjs`, `scripts/audit-package.mjs`, `scripts/check-secrets.mjs`
- Create: `.github/workflows/ci.yml`, `README.md`, `docs/README.zh-CN.md`, `docs/configuration.md`, `docs/troubleshooting.md`, `SECURITY.md`, `CHANGELOG.md`, `THIRD_PARTY_NOTICES.md`
- Test: `tests/packed-acceptance.spec.ts`

**Interfaces:**
- Produces: installable npm tarball, compatibility report, checksums, Git tag and GitHub Release.

- [ ] Begin ARE observation for the exact repository, isolated DSH home, and task-owned temporary roots.
- [ ] Write failing acceptance that packs, installs into a fresh profile, boots DSH, discovers all tools, exercises read enrichment and edit diagnostics, reloads, and removes the plugin.
- [ ] Implement packaging/audit scripts and complete user, security, compatibility, and troubleshooting documentation.
- [ ] Run unit, integration, loader, client, packed-artifact, typecheck, build, dependency, secret, and package-content gates.
- [ ] Run installed macOS DSH smoke and a real-model comparison if configured credentials are available; report that gate separately.
- [ ] End ARE observation, remove only task-owned temporary artifacts, verify residue, and retain the final tarball/checksum/reports.
- [ ] Create the public GitHub repository, push `main`, tag `v0.1.0`, publish the GitHub Release with checksums and compatibility evidence, and publish npm only if the authenticated account owns the unclaimed package name.
