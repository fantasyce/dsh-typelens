# DSH TypeLens v0.1.1 acceptance

Date: 2026-08-28 (Asia/Shanghai)

## Release candidate

- DSH TypeLens: `0.1.1`
- Target DSH: `0.1.1-rc.2`
- Host acceptance: macOS arm64
- CI targets: Linux, Node.js 22.19 and 24

## Source and package gates

- TypeScript typecheck
- 18 test files and 60 tests
- Configured V8 coverage thresholds
- Host and DSH client builds
- Static site and public-surface checks
- Production dependency audit
- Source and extracted-package secret scans
- Allowlisted packed-artifact contents

## Isolated installed-artifact acceptance

The final tarball is installed into a fresh task-owned `DSH_HOME`. Acceptance
boots DSH Web twice, exercises the health/settings API, persists and reloads a
setting, executes the served DSH client bundle, registers all four tools,
executes lookup/list/check/explain, verifies read and edit hooks, removes the
plugin, and cleans the isolated runtime.

The v0.1.1 package also passes `pnpm peers check` inside a fresh DSH profile.
DSH-provided runtime peers no longer produce misleading missing-peer warnings
during the supported profile installation.

## Real local DSH acceptance

The GitHub v0.1.0 artifact was first installed into the machine's actual DSH Web
and Headless profiles to establish the production path before the packaging
fix:

- The launchd-managed Web service restarted from the installed profile.
- `/api/typelens` reported a healthy `0.1.0` runtime and the served client
  bundle loaded.
- The native Chinese **Settings → TypeLens** panel rendered without browser
  console warnings.
- A setting changed through the UI, persisted in a `0600` file, survived a
  reload, and was restored to its default.
- A real Headless Agent session was constrained to read only `main.ts`; it
  correctly received the imported `Account { id: string; active: boolean }`
  declaration from TypeLens without reading `types.ts`.
- A second real Agent session edited the synthetic fixture and immediately
  reported `TS2322: Type 'string' is not assignable to type 'boolean'.`

The final v0.1.1 release artifact must repeat installation, Web health/UI,
Headless hook, checksum, removal, and reinstall verification before publication
is considered complete.

## Boundaries

- Vue and Svelte template semantics are not analyzed.
- TypeScript compiler calls use cooperative deadlines plus hard source, file,
  result, and cache caps; synchronous compiler work is not preempted mid-call.
- Windows remains a compatibility target, not a v0.1.1 release gate.
- TypeLens makes no external network requests itself. Type context included in
  an Agent step follows the configured DSH model provider.
