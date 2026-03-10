---
name: Subsumption Program PR
about: Execution issue for a single Subsumption Program PR lane
title: "[SUBSUMPTION][PR-XX] <title>"
labels: ["subsumption", "planned"]
assignees: []
---

## Objective
<!-- One-sentence goal -->

## PR Number
PR-XX

## Depends On
- [ ] PR-XX
- [ ] PR-XX

## Target Paths
- `path/to/file`
- `path/to/file`

## Required Gates
- [ ] gate:domain:name
- [ ] gate:domain:name

## Deliverables
- [ ] Code / schema / docs added under target paths
- [ ] Fixtures added
- [ ] Gate script added or updated
- [ ] `docs/subsumption/PR-XX.md` aligned with implementation

## Local Validation
```bash
pnpm test
pnpm lint
pnpm gate:<domain>
```

## Acceptance Criteria
- [ ] All required files exist
- [ ] Required gates pass locally
- [ ] Required gates pass in CI
- [ ] Deterministic outputs verified
- [ ] No unrelated files changed

## Merge Notes
<!-- sequencing, rebase notes, blockers -->
