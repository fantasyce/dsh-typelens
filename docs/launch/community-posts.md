# Community launch copy

These drafts are prepared for channels the owner may choose later. Reddit, X,
and LinkedIn are intentionally not posted in this launch.

## Show HN

**Title:** Show HN: TypeLens – automatic type context and edit diagnostics for DeepSeek Harness

I built DSH TypeLens to close a small coding-Agent loop: reading a file often
does not reveal the imported types that govern it, and an edit can move on
before the new compiler error is visible.

TypeLens adds bounded complete declarations after successful reads and
changed-file-first diagnostics after writes and edits. It also provides lookup,
list, check, and explain tools; TS/TSX/JS/JSX plus Vue/Svelte script support;
workspace containment; token/source/cache limits; and a circuit breaker.

TypeLens itself makes no external network requests and persists no
source-bearing analysis cache. MIT licensed.

Source: https://github.com/fantasyce/dsh-typelens
Release: https://github.com/fantasyce/dsh-typelens/releases/tag/v0.1.1

## DeepSeek Harness community

DSH TypeLens v0.1.1 adds automatic bounded type context after reads and
changed-file-first TypeScript diagnostics after edits. Four explicit tools and
a native DSH Web settings/health section are included.

The release was installed and exercised in real DSH 0.1.1-rc.2 Web and Headless
profiles. A live synthetic Agent session read only `main.ts` yet correctly
received the imported `Account` interface from TypeLens; a second edit
returned `TS2322` immediately.

Quickstart: https://github.com/fantasyce/dsh-typelens/blob/main/docs/quickstart.md
Release: https://github.com/fantasyce/dsh-typelens/releases/tag/v0.1.1

## Reddit

**Title:** Open-source automatic type context and edit diagnostics for DeepSeek Harness

DSH TypeLens gives coding Agents imported type declarations immediately after a
file read and changed-file-first diagnostics immediately after an edit. It is
bounded, fail-open, workspace-contained, and makes no external network requests
of its own.

Source: https://github.com/fantasyce/dsh-typelens

## X

DSH TypeLens gives DeepSeek Harness coding Agents bounded imported type context
after reads and immediate diagnostics after edits. Local analysis, four
explicit tools, native settings, TS/JS + Vue/Svelte scripts.

https://github.com/fantasyce/dsh-typelens

## LinkedIn

Coding Agents often read the current file but miss the imported type contract
that governs it. DSH TypeLens adds bounded type context after reads and
changed-file-first diagnostics after edits inside DeepSeek Harness.

It is fail-open, workspace-contained, local-analysis-first, and ships with
explicit lookup, list, check, and explain tools.

https://github.com/fantasyce/dsh-typelens

## 中文

DSH TypeLens 为 DeepSeek Harness 补上了编码 Agent 的类型反馈闭环：读取文件后
自动补充有边界的导入类型声明，写入或编辑后立即返回变更文件优先的 TypeScript
诊断。它还提供四个显式工具、原生设置与健康页面，并支持 TS/JS 及 Vue/Svelte
脚本区块。

源码：https://github.com/fantasyce/dsh-typelens
正式版本：https://github.com/fantasyce/dsh-typelens/releases/tag/v0.1.1
