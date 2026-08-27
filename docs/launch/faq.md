# Launch FAQ

## Why add TypeLens when DSH can read source files?

Reading a file does not automatically reveal declarations imported from other
files. TypeLens adds only the bounded type context needed for the visible code.

## Does it replace a full IDE language server?

No. It optimizes the Agent loop: automatic context after reads, diagnostics
after edits, and four explicit tools. It deliberately caps work and output.

## Does TypeLens upload source code?

TypeLens itself makes no outbound requests and does not persist source-bearing
analysis state. Context injected into an Agent step follows the configured DSH
model provider.

## What languages are supported?

TypeScript, TSX, JavaScript, and JSX are supported. Vue and Svelte script blocks
are supported; template semantics are not analyzed.

## What happens when analysis fails or times out?

The original DSH file operation remains successful. TypeLens records bounded,
source-free health counters and temporarily pauses automatic analysis after
repeated operational failures.

## How do I report a compatibility case?

Use the integration issue form with a small synthetic fixture. Never publish
credentials, proprietary source, private paths, or full model requests.
