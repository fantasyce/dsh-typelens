# Changelog

All notable changes are documented here.

## 0.1.1 — 2026-08-28

- Mark DSH-provided runtime peers as optional at profile-install time so the
  supported tarball install completes without misleading missing-peer warnings.
- Revalidate the published package in both isolated and real local DSH
  0.1.1-rc.2 Web and Headless profiles.

## 0.1.0 — 2026-08-28

- Add automatic bounded type context after supported DSH file reads.
- Add changed-file-first incremental diagnostics after writes and edits.
- Add explicit lookup, list, check, and explain tools.
- Add TS/TSX/JS/JSX analysis and optional Vue/Svelte script adapters.
- Add realpath workspace containment, safe default exclusions, LRU caches, deadlines, and an availability circuit breaker.
- Add a local settings/health API and native DSH Web settings section.
- Add isolated packed-artifact acceptance, package and secret audits, bilingual documentation, and Linux CI for Node.js 22 and 24.
