# DSH TypeLens quickstart

## Install

```sh
dsh plugin --profile web add https://github.com/fantasyce/dsh-typelens/releases/download/v0.1.1/dsh-typelens-0.1.1.tgz
```

Restart the Web profile and confirm the composed row:

```sh
dsh --profile web --dump-config | grep -A2 typelens
```

Open DSH Web, choose **Settings → TypeLens**, and confirm the health row reports
`0.1.1`.

## What happens automatically

When the Agent successfully reads a supported source file, TypeLens appends
bounded declarations needed to understand the visible code. When the Agent
writes or edits a file, TypeLens appends changed-file-first diagnostics.
Analysis failures never turn a successful file operation into a failed one.

## Explicit tools

- `typelens_lookup_type` finds one declaration and bounded usage evidence.
- `typelens_list_types` lists matching declarations.
- `typelens_check` checks one file or a bounded project.
- `typelens_explain` reports effective limits, adapters, cache, and health.

Use synthetic source when filing public issues. Type context included in an
Agent step follows the privacy boundary of the configured DSH model provider.
