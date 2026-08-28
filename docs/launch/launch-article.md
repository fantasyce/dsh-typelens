# Give coding Agents the type context they were missing

A coding Agent can read a TypeScript file and still miss the contract that
actually governs it. The visible file may import an interface, alias, or generic
from elsewhere in the workspace. After an edit, the Agent may continue without
seeing the compiler error it just introduced.

DSH TypeLens closes that loop inside DeepSeek Harness.

After a successful read, it appends bounded, complete declarations relevant to
the visible code. After a write or edit, it appends changed-file-first
diagnostics. The original tool result stays intact, and analysis failure never
turns a successful file operation into a failure.

TypeLens also exposes explicit lookup, list, check, and explain tools. It
supports TypeScript, TSX, JavaScript, JSX, and the script blocks of Vue and
Svelte components. Workspace realpath containment, deny patterns, source caps,
token budgets, LRU caches, cooperative deadlines, and a circuit breaker keep
the analysis bounded.

The privacy boundary is explicit: TypeLens itself makes no external network
requests and persists no source-bearing analysis cache. Any context appended to
an Agent step follows the DSH model provider the user configured.

Install or upgrade the npm package in a DSH Web profile, then restart that
profile:

```sh
dsh plugin --profile web add dsh-typelens
dsh plugin --profile web update dsh-typelens --latest
```

The same commands work for one-shot Agents by replacing `web` with `headless`.

Start with the [quickstart](https://github.com/fantasyce/dsh-typelens/blob/main/docs/quickstart.md),
inspect the [configuration reference](https://github.com/fantasyce/dsh-typelens/blob/main/docs/configuration.md),
or download the [latest release](https://github.com/fantasyce/dsh-typelens/releases/latest).

We welcome synthetic framework and workspace cases, especially high-value type
context patterns that are not yet represented in the test suite.
