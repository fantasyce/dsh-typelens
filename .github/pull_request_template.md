## Problem

Describe the missing type context, diagnostic, compatibility, safety, or
documentation behavior.

## Change

Explain the smallest change that addresses it.

## Verification

- [ ] I observed the relevant test fail before the implementation change.
- [ ] `pnpm verify` passes.
- [ ] `pnpm vitest run --coverage` passes.
- [ ] Packaging changes pass `pnpm accept:packed -- <tarball> <task-owned-root>`.
- [ ] I reviewed the diff and packed artifact for secrets and private paths.
- [ ] I listed every DSH version and platform exercised or not exercised.

## Release impact

State whether this changes automatic context, diagnostics, explicit tools,
settings, package installation, or documentation only.
