# Stabilization Roadmap Handoff

**Authority:** This document aligns with the Summit Readiness Assertion and stabilization governance.

## What is a stabilization roadmap candidate?

A stabilization roadmap candidate is a draft-only roadmap entry generated from stabilization
retrospective metrics. It is a rule-based signal for systemic fixes, not feature work, and is
limited to a maximum of five candidates per month.

## How triggers work

Candidates are derived from deterministic triggers in the stabilization retrospective JSON, using
thresholds in `release-policy.yml`:

- `blocked_unissued > 0` in any week → **issuance-hygiene**
- `evidence_compliance < min` in 2+ weeks → **evidence-compliance**
- `overdue_load_p0 > 0` in 2+ weeks → **p0-sla-adherence**
- `risk_index_avg >= threshold` → **systemic-risk-reduction**

Each candidate is scored for severity and persistence, then capped by `max_candidates`.

## Draft vs apply mode

Default policy mode is **draft**. Draft mode writes markdown artifacts only:

- `artifacts/stabilization/roadmap-handoff/drafts/ROADMAP_<slug>.md`
- `artifacts/stabilization/roadmap-handoff/digest.md`

Switch to **apply** mode only after governance approval. Apply mode deduplicates by slug and
creates or updates issues with the labels configured in policy.

## Dedupe by slug

Each candidate draft includes a stable marker:

```
<!-- stabilization-roadmap-slug: <slug> -->
```

The issue sync job uses this marker to find existing issues and avoid duplicates.

## Override thresholds

Edit `release-policy.yml` under `stabilization_roadmap_handoff.thresholds` to adjust trigger
thresholds. Keep the changes in the same PR as the release process update to preserve audit
alignment.
