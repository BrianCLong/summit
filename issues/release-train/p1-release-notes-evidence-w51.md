---
title: Finalize release notes and evidence bundle for 2025-W51
labels: [release-train, P1]
owner: docs-qa
---

## Context

Release-train exit criteria require drafted notes, promotion checklist, and evidence captured. No W51-specific notes or evidence references exist yet.

## Acceptance criteria

- Draft W51 release notes summarizing merged changes, risk calls, and rollback plan, and attach them to the release-train tracker.
- Append promotion evidence (digests, checksums, CI links) to `ops/release/release-report.md` after verify-images and promotion runs.
- Ensure release notes reference Promise Tracker items closed during W51 and any deferred items.
- Provide a ready-to-run post-deploy validation checklist and confirm QA signoff is recorded in the tracker.
