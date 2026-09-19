# DSH TypeLens

Local-first type context and edit diagnostics for [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness).

TypeLens watches successful DSH file reads and edits. After a read, it appends only the complete type declarations needed to understand the visible code. After an edit, it appends bounded TypeScript diagnostics with new errors first. The original tool result always remains intact, and an analysis failure never turns a successful file operation into a failure.

## Why TypeLens

- Automatic context: agents do not have to remember to call an LSP tool.
- Full declarations: output is ranked, deduplicated, cycle-safe, and never cut mid-signature.
- Immediate feedback: TS/JS diagnostics arrive directly after writes and edits.
- Local analysis: TypeLens makes no outbound requests and never persists source-bearing analysis state.
- Bounded and fail-open: workspace, file-size, timeout, depth, result, cache, and token limits are enforced.
- Native DSH integration: four explicit tools, lifecycle hooks, health API, and a Web settings section.

## Compatibility

Version 0.1.2 is acceptance-tested with DSH 0.1.1-rc.2 on macOS arm64. GitHub CI covers Linux with Node.js 22 and 24. TypeScript, TSX, JavaScript, and JSX are supported. Vue and Svelte script blocks use their optional compiler when available and retain a bounded first-instance-script fallback when it is absent. Template semantics are outside the current analysis boundary. Windows is a compatibility target but is not a 0.1.2 release gate.

## Install

DSH delegates profile dependency management to `pnpm`. Confirm that both
commands are available before installing a plugin:

```sh
dsh --version
pnpm --version
```

If `pnpm` is missing, install it using the
[official pnpm installation guide](https://pnpm.io/installation), then run:

```sh
dsh plugin --profile web add dsh-typelens
dsh plugin --profile headless add dsh-typelens
```

The npm package is the canonical install source. Use `dsh-typelens@0.1.2` to
pin this release, or use the verified
[GitHub release tarball](https://github.com/fantasyce/dsh-typelens/releases/tag/v0.1.2)
when an explicit archive URL is required.

Restart the affected DSH profile, then verify the composed row:

```sh
dsh --profile web --dump-config
```

The package bundle inserts a `typelens` row automatically. In DSH Web, open Settings → TypeLens to inspect health, change automatic behavior and limits, or reset in-memory caches and counters.

## Upgrade

Update each profile where TypeLens is installed, then restart that profile so
the running Host and client load the new package bytes:

```sh
dsh plugin --profile web update dsh-typelens --latest
dsh plugin --profile headless update dsh-typelens --latest
```

Use `dsh --profile web --dump-config` after restart to confirm the composed
`typelens` row. To remain on an approved release, keep the pinned dependency
instead of using `--latest`.

To remove it:

```sh
dsh plugin --profile web remove dsh-typelens
```

## Model-facing tools

- `typelens_lookup_type`: find a named declaration relevant to a file.
- `typelens_list_types`: list bounded declarations relevant to a file.
- `typelens_check`: run bounded file and project diagnostics.
- `typelens_explain`: inspect effective configuration, health, circuit state, and source-free counters.

All returned paths are workspace-relative. Explicit file tools require an active DSH session workspace.

## Safe defaults

Automatic context is limited to 800 estimated tokens, depth 4, 1.5 seconds, and 2 MiB files. Explicit checks receive 5 seconds. A circuit breaker pauses automatic analysis for 30 seconds after five operational failures in 60 seconds; explicit tools and health remain available. Dependency trees, build output, VCS metadata, coverage, and environment files are denied by default.

See [configuration](docs/configuration.md), [troubleshooting](docs/troubleshooting.md), and the [Chinese guide](docs/README.zh-CN.md).
The current release gate is recorded in [v0.1.2 acceptance](docs/acceptance-v0.1.2.md).

## Installation feedback

After trying TypeLens in a real DSH profile, use the short
[verified install report](https://github.com/fantasyce/dsh-typelens/issues/new?template=verified_install.yml)
to record whether installation and the first context or diagnostic result
worked. Include versions and bounded source-free evidence only.

## Development

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` type-checks, runs the complete test suite, builds both Host and DSH client artifacts, scans for secrets, audits package contents, and creates the tarball under `artifacts/`.

## Agent Reliability Toolkit

TypeLens is one independent part of a small, local-first reliability toolkit:

- [Agent Runtime Proof](https://github.com/fantasyce/agent-runtime-proof) verifies that a live Agent or MCP runtime matches the artifact you approved.
- [Agent Residue Evidence](https://github.com/fantasyce/agent-residue-evidence) records task-scoped files, processes, and listening ports left by tests and builds.
- [DSH TypeLens](https://github.com/fantasyce/dsh-typelens) adds bounded type context and edit diagnostics to DeepSeek Harness.

Each project remains separately installable and keeps its own trust boundary.

## Security and privacy

TypeLens persists only validated settings under `$DSH_HOME/typelens/settings.json` with owner-only permissions. Analysis state and counters live in memory. Type context and diagnostics appended to an agent step become part of the next DSH model request, so they follow the privacy policy of your configured model provider. See [SECURITY.md](SECURITY.md) for reporting and the full trust boundary.

## License

MIT
