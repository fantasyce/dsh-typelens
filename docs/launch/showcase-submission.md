# Showcase submission draft

**Name:** DSH TypeLens

**Tagline:** Give DeepSeek Harness coding Agents the type context they were missing.

**Category:** Developer tools / coding Agents / DeepSeek Harness

**Description:** DSH TypeLens automatically appends bounded imported type
declarations after successful file reads and changed-file-first TypeScript
diagnostics after writes and edits. It also exposes lookup, list, check, and
explain tools plus a native DSH Web settings and health surface.

**Technical distinction:** TypeLens keeps declarations complete while enforcing
workspace realpath containment, deny patterns, file and project source caps,
token budgets, LRU limits, cooperative deadlines, duplicate suppression, and a
circuit breaker. Analysis failure never changes a successful DSH file operation
into a failure.

**Source:** https://github.com/fantasyce/dsh-typelens

**Website:** https://fantasyce.github.io/dsh-typelens/

**Release:** https://github.com/fantasyce/dsh-typelens/releases/tag/v0.1.2

**Install:**

```sh
dsh plugin --profile web add dsh-typelens
```

**Upgrade:**

```sh
dsh plugin --profile web update dsh-typelens --latest
```

Restart the Web profile after installation or upgrade. Replace `web` with
`headless` for the Headless profile.
