# Security policy

## Supported versions

Security fixes are provided for the latest published TypeLens release. Version 0.1.1 targets DSH 0.1.1-rc.2.

## Reporting

Please use GitHub's private vulnerability reporting for `fantasyce/dsh-typelens`. Do not open a public issue for a suspected source disclosure, path traversal, cross-origin weakness, dependency compromise, or denial-of-service vector. Include the affected version, platform, DSH version, a minimal reproduction, and impact. Never attach private source code, credentials, tokens, or complete DSH configuration.

## Trust boundary

TypeLens reads files only to perform local analysis. It does not initiate network requests and does not persist source-bearing caches, prompts, diagnostics, or transcripts. Type context and diagnostics appended to an agent step are model-visible and therefore travel through the model provider configured in DSH; users requiring a machine-local boundary must select a local model provider. Paths are resolved through realpath containment before reading; workspaces are isolated by default; source size, analysis time, depth, result count, and caches are bounded.

The local health/settings endpoint accepts same-origin or same-site browser requests, caps JSON request bodies at 64 KiB, validates the complete configuration before an atomic update, and returns no source text. `$DSH_HOME/typelens/settings.json` contains settings only and is owner-readable/writable.

Automatic integration is fail-open for DSH availability: TypeLens exceptions cannot convert a successful file operation into a failed result. This does not mean analysis errors are ignored; aggregate failure counters and circuit state remain visible through `typelens_explain` and the settings page.
