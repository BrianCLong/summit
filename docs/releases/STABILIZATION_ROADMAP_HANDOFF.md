# Stabilization Roadmap Handoff

The stabilization roadmap handoff converts retrospective metrics into a deduplicated set of
roadmap candidate drafts. It is governed by policy, defaults to draft-only output, and does not
create issues unless explicitly allowed.

## What is a Stabilization Roadmap Candidate?

A candidate is a rule-triggered systemic fix proposal backed by stabilization metrics. Each
candidate includes a stable slug identifier (e.g., `issuance-hygiene`) to prevent duplicates and
maintain lineage across months.

## Trigger Rules

Triggers are defined in `docs/ci/STABILIZATION_RETROSPECTIVE_POLICY.yml` under
`stabilization_roadmap_handoff.thresholds`. Examples:

- `blocked_unissued_p0 > 0` in any week → `issuance-hygiene`
- `evidence_compliance < min` in ≥ 2 weeks → `evidence-compliance`
- `overdue_load_p0 > 0` in ≥ 2 weeks → `p0-sla-adherence`
- `risk_index_avg >= threshold` → `systemic-risk-reduction`

## Draft Mode (Default)

Draft mode writes artifacts only:

- `artifacts/stabilization/roadmap-handoff/drafts/ROADMAP_<slug>.md`
- `artifacts/stabilization/roadmap-handoff/digest.md`

No issues are created in draft mode.

### Fixtures

Sample draft outputs are stored in `fixtures/stabilization/roadmap-handoff/`.

## Apply Mode (Opt-In)

Set `stabilization_roadmap_handoff.mode: apply` in the policy file to enable issue creation.
Apply mode:

1. Searches for existing issues by slug marker.
2. Creates or updates issues with labels `roadmap`, `stabilization`, and `needs-triage`.
3. Ensures one issue per slug per period (dedupe by marker).

## Dedupe by Slug

Each draft includes a marker comment:

```text
<!-- stabilization-roadmap:<slug> -->
```

This marker ensures idempotent updates and prevents duplicate roadmap entries.

## Override Thresholds

Adjust `stabilization_roadmap_handoff.thresholds` in
`docs/ci/STABILIZATION_RETROSPECTIVE_POLICY.yml` to tune trigger sensitivity. Changes are
governed by the policy file and tracked in the retrospective data-quality notes.

## Running Locally

```bash
node scripts/releases/derive_stabilization_roadmap_candidates.mjs --retro artifacts/stabilization/retrospective/retro_latest.json
node scripts/releases/sync_stabilization_roadmap_handoff.mjs --candidates artifacts/stabilization/roadmap-handoff/candidates_latest.json
```
