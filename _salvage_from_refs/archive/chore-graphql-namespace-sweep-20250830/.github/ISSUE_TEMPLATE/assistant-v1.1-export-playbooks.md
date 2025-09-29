---
name: Assistant v1.1 — Export Playbooks
about: Track wizard + templates for reproducible exports with provenance
title: "Assistant v1.1: Export Playbooks"
labels: ["release: v1.1", "theme: exports", "area: client", "area: server"]
milestone: "Assistant v1.1"
---

## Scope
- Wizard + templates to export cited subgraphs & docs with a provenance bundle (NDJSON + Graph).

## Checklist
- [ ] Export schema + manifest (graph + docs + checksums)
- [ ] Wizard UI (select scope/templates; confirm diffs)
- [ ] Template storage + reuse (save/run)
- [ ] Bundler (NDJSON + Graph + manifest zip)
- [ ] Tests: unit + integration (mocked), nightly WITH_SERVICES
- [ ] Docs: export guide + CLI parity (optional)

## Acceptance
- [ ] Saved playbook yields a reproducible bundle with provenance manifest

