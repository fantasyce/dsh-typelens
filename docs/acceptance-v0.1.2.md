# DSH TypeLens v0.1.2 acceptance

## Scope

Version 0.1.2 is a documentation-discovery patch. It keeps the 0.1.1 analysis
engine and DSH compatibility boundary, updates the reported package/runtime
version, and makes npm install, version pinning, profile upgrade, restart, and
post-restart verification instructions visible on every maintained public
surface.

## Source and package gates

- Target DSH: `0.1.1-rc.2`.
- TypeScript type-check passed.
- 18 test files and 61 tests passed.
- Website and public-surface checks passed.
- Host and client builds passed.
- Tracked-file secret scan passed for 91 files.
- The 35-file `dsh-typelens-0.1.2.tgz` passed the package-content audit.

## Installed-artifact gate

The packed 0.1.2 archive was installed into a fresh task-owned `DSH_HOME` with
the real local DSH CLI. Acceptance booted the Web profile twice, verified the
0.1.2 health snapshot and client module, persisted settings across restart,
exercised explicit tools plus read-context and edit-diagnostic hooks, removed
the plugin, and confirmed the isolated profile was clean.

## Publication gate

The Git tag and GitHub Release must point to the merged `main` commit. The
Release event publishes npm through GitHub OIDC trusted publishing. Registry
metadata, the Registry-downloaded tarball, its embedded README, and a fresh DSH
install are verified again after publication; those live checks are not implied
by the pre-release source and packed-artifact gates above.

## Boundary

Windows remains a compatibility target rather than a 0.1.2 release gate. The
existing non-blocking tsdown CommonJS and `define` option warnings are unchanged
and do not alter the emitted Host or client artifacts.
