# Contributing

Thank you for helping make type-aware DeepSeek Harness sessions more reliable.

## Before opening a change

- Search existing issues and Discussions.
- Keep analysis bounded, workspace-contained, fail-open, and source-private.
- Do not add network calls, telemetry, source-bearing persistent caches, or
  model-provider assumptions.
- Report vulnerabilities privately according to `SECURITY.md`.

## Development

Use a supported Node.js release and run:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm verify
pnpm vitest run --coverage
```

Behavior changes require a failing test first. Packaging changes must also pass
the packed-artifact acceptance against a fresh, isolated `DSH_HOME`.

## Pull requests

Keep each pull request focused. Explain the problem, data boundary, test
coverage, DSH version exercised, and any platform not exercised. By
contributing, you agree that your contribution is licensed under MIT.
