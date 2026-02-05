# FS-Researcher Workspace Mode (arXiv:2602.01566)

## Purpose

Introduce a deterministic, file-system workspace pipeline that captures sources, builds a citation-grounded
knowledge base, and writes reports from the KB-only stage.

## Workspace Schema

```
workspace/
├── index.md
├── todo.md
├── log.md
├── knowledge_base/
│   └── kb.md
├── sources/
│   └── <source-id>.md
├── report_outline.md
├── report.md
└── artifacts/
    ├── metrics.json
    ├── report.json
    └── stamp.json
```

## Import / Export Matrix

**Imports**
- Summit CLI execution harness (`summit/cli/*`).
- Deterministic JSON writer utility pattern.
- Security gates for prompt injection and PII redaction.

**Exports**
- Workspace schema (above).
- `artifacts/metrics.json` (citation coverage + counts).
- `artifacts/report.json` (section status + checklist gates).
- `artifacts/stamp.json` (deterministic workspace hash).

## Determinism Rules

- JSON artifacts are sorted-key, compact-serialized.
- `run_meta.json` (if added later) is excluded from stamp hashing.
- Sources are stored verbatim; KB lines must include Evidence IDs and `sources/` paths.

## Non-Goals (MWS)

- No online browsing; fixtures only.
- No benchmark harness; evaluation is limited to deterministic metrics.
- No claims of benchmark parity or superiority.
