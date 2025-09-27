---
name: Assistant v1.1 — Inline Citation Highlighting
about: Track token-level citation rendering with provenance + pivot
title: "Assistant v1.1: Inline Citation Highlighting"
labels: ["release: v1.1", "theme: citations", "area: client", "area: graphql"]
milestone: "Assistant v1.1"
---

## Scope
- Token-level spans (graph/doc provenance), hover details, keyboard nav, click→pivot.

## Checklist
- [ ] Provenance mapper (token → cite source)
- [ ] Span renderer with virtualization/chunking
- [ ] Hover/inspect + color-by-source
- [ ] Keyboard navigation (a11y) for cite spans/list
- [ ] GraphQL `citations(answerId)` pivot wiring
- [ ] Tests: unit + a11y smoke; nightly fuzz enabled
- [ ] Docs: UX guide + dev notes

## Acceptance
- [ ] Spans render without perf regressions; keyboard accessible
- [ ] Pivot to cited graph nodes works end-to-end

