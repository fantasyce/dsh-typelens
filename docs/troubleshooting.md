# Troubleshooting

## The plugin row is absent

Run `dsh --profile web --dump-config`. If `typelens` is missing, install the npm package into that exact profile with `dsh plugin --profile web add dsh-typelens`, then restart it. Use `dsh-typelens@0.1.2` when policy requires the current release to remain pinned. DSH profiles have independent dependency trees.

## Web settings do not appear

Confirm the Host row is active and request `/api/typelens` from the same DSH Web origin. A 200 response proves the Host API, not the browser bundle. Hard-refresh after a plugin install. The browser bundle must begin with the DSH module-loader registration and is served from `/plugins/dsh-typelens/client.js`.

## No context was appended

TypeLens intentionally skips unsupported files, denied paths, oversized files, unsuccessful tool calls, reads without useful referenced declarations, and results where no complete declaration fits the budget. Run `typelens_explain` to inspect configuration, counters, and circuit state. Increase the token budget or depth only after confirming the file is within the session workspace.

## Diagnostics repeat or seem incomplete

The changed file is prioritized, output is capped by `maxDiagnostics`, and unchanged pre-existing errors are marked as existing or summarized. `typelens_check` performs an explicit bounded check. Reset cache and counters after an external bulk rewrite.

## Automatic analysis is paused

Five operational failures within 60 seconds open the circuit for 30 seconds. This protects DSH file tools from repeated analysis cost. Automatic behavior resumes after the pause; explicit tools remain available. Deadlines are cooperative around TypeScript's synchronous compiler pass; file, project-source, result, and cache caps provide the complementary hard bounds. Persistent failures usually indicate malformed project configuration, inaccessible files, or an unsupported adapter.

## Vue or Svelte degradation

The base plugin works without framework compilers. Install `@vue/compiler-sfc` or `svelte` in the DSH profile when SFC extraction is required. Missing optional packages produce a non-fatal degradation and never break the underlying read or edit.

## Security boundary

Outside-workspace access is disabled by default and real paths are checked after symlink resolution. Do not enable it merely to silence a containment error. Report suspected traversal, source disclosure, or cross-origin issues privately as described in `SECURITY.md`.
