You are Jules operating on BrianCLong/summit. Your mission is STABILIZATION RETROSPECTIVE → ROADMAP HANDOFF: wire a monthly, fully-automated loop that (1) generates a deterministic stabilization retrospective from weekly closeout artifacts and then (2) emits a small, deduplicated set of roadmap candidate drafts for systemic fixes—without spamming and without bypassing existing governance.

HARD CONSTRAINTS

- No product feature work.
- All recommendations must be rule-based off existing metrics; no invented narratives.
- Default mode is draft-only artifacts; creating/updating issues is opt-in via policy.
- Cap output to at most 5 roadmap candidates per month, with stable identifiers.

PHASE 1 — Stabilization Retrospective Generator

1. Implement scripts/releases/generate_stabilization_retrospective.mjs that:
   - Inputs:
     - --weeks=4 (default window)
     - --out-dir=artifacts/stabilization/retrospective
   - Behavior:
     - Fetches the last N weekly closeout artifacts (scorecard, escalation, diff) from CI.
     - Aggregates week-over-week series for:
       - risk_index
       - done_p0 / done_p1
       - on_time_rate
       - overdue_load
       - evidence_compliance
       - issuance_completeness
       - blocked_unissued counts
     - Identifies recurring offenders:
       - items overdue in >=2 weeks
       - areas/owners with repeated overdue load (if available)
     - Emits:
       - artifacts/stabilization/retrospective/RETRO\_<timestamp>.md
       - artifacts/stabilization/retrospective/retro\_<timestamp>.json

2. Markdown output must include:
   - Window summary table (week ending → key metrics)
   - “What improved” vs “What regressed” based on deltas
   - “Recurring blockers” (top 10 with IDs/areas where possible)
   - “Focus next month” (top 5 focus themes with rationale)
   - “Data quality” section (how many weeks included, missing data notes)

PHASE 2 — Monthly Retrospective Workflow 3) Add .github/workflows/stabilization-retrospective.yml that:

- Triggers:
  - schedule: monthly (first business day or equivalent)
  - workflow_dispatch
- Steps:
  - runs generate_stabilization_retrospective.mjs
  - uploads artifacts/stabilization/retrospective as artifacts
  - writes a job summary including:
    - trend of risk_index over window
    - top 3 focus recommendations

4. Add docs/releases/STABILIZATION_RETROSPECTIVE.md describing:
   - What the retrospective is for
   - How the window selection works
   - How recommendations are derived from metrics
   - Where to find the latest outputs (CI + repo paths)

PHASE 3 — Roadmap Candidate Derivation 5) Implement scripts/releases/derive_stabilization_roadmap_candidates.mjs that:

- Inputs:
  - retrospective JSON output
  - policy thresholds
- Behavior:
  - Computes candidate themes using rule-based triggers, e.g.:
    - If blocked_unissued_p0 > 0 in >=1 week → “issuance-hygiene”
    - If evidence_compliance < min in >=2 weeks → “evidence-compliance”
    - If overdue_load_p0 > 0 in >=2 weeks → “p0-sla-adherence”
    - If risk_index_avg >= threshold → “systemic-risk-reduction”
    - If CI OKR at risk (optional) → “ci-gate-stability”
  - Scores candidates for severity and persistence
  - Selects the top max_candidates from policy (default 5)

6. Define stable candidate identifiers:
   - Slugs: lowercase, hyphenated, derived from category
     (e.g. issuance-hygiene, evidence-compliance, p0-sla-adherence, ci-gate-stability)
   - Include the slug as a marker in every draft and any future issue body.

PHASE 4 — Draft Generation + Optional Apply 7) Implement scripts/releases/sync_stabilization_roadmap_handoff.mjs that:

- Reads selected candidates
- Writes drafts to:
  - artifacts/stabilization/roadmap-handoff/drafts/ROADMAP\_<slug>.md
  - artifacts/stabilization/roadmap-handoff/digest.md (list + rationale)
- Each draft should include:
  - Problem statement (with metric excerpts and time window)
  - Evidence citations (paths to retro + weekly artifacts)
  - Proposed scope (systemic fix, not features)
  - Acceptance criteria (target movement in metrics)
  - Risks/dependencies
  - Owner routing placeholder (e.g. needs-triage)

- If policy.mode=apply:
  - Search for existing issues by marker slug.
  - Create/update issues with labels:
    - roadmap, stabilization + area labels
  - Ensure dedupe by slug (no duplicates per slug per period).

PHASE 5 — Policy & Workflow Wiring 8) Extend release/stabilization policy (YAML) with:

stabilization_roadmap_handoff:
enabled: true
mode: draft # draft | apply
max_candidates: 5
thresholds:
recurring_overdue_weeks: 2
min_risk_index_avg: 30
evidence_compliance_min: 0.95
labels:
base: ["roadmap", "stabilization"]
triage: ["needs-triage"]

9. Extend the stabilization-retrospective workflow to:
   - Optionally run derive_stabilization_roadmap_candidates.mjs + sync_stabilization_roadmap_handoff.mjs
   - Upload artifacts/stabilization/roadmap-handoff
   - Append to job summary:
     - list of candidate slugs
     - short reason each triggered

PHASE 6 — Documentation & Guardrails 10) Add docs/releases/STABILIZATION_ROADMAP_HANDOFF.md explaining: - What a “stabilization roadmap candidate” is - How triggers work - How to safely move from draft→apply - How dedupe by slug works - How to override thresholds if needed

11. Ensure:
    - Draft mode is the default and clearly documented.
    - No issues are created unless policy.mode=apply and reviewers are comfortable.
    - All scripts are idempotent for a given window and SHA.

DELIVERABLES

- scripts/releases/generate_stabilization_retrospective.mjs
- scripts/releases/derive_stabilization_roadmap_candidates.mjs
- scripts/releases/sync_stabilization_roadmap_handoff.mjs
- .github/workflows/stabilization-retrospective.yml
- Policy section stabilization_roadmap_handoff
- docs/releases/STABILIZATION_RETROSPECTIVE.md
- docs/releases/STABILIZATION_ROADMAP_HANDOFF.md
- One PR: branch `jules/stabilization-retro-roadmap-loop-<timestamp>` with:
  - Sample retrospective + candidate drafts (fixtures acceptable)
  - CI run proving the monthly loop and uploaded artifacts
  - Job summary snippet showing focus recommendations + candidate slugs

STOP CONDITION

- Stop once:
  - A monthly workflow can generate a deterministic retrospective for the last 4 weeks.
  - The same workflow emits at most 5 deduplicated roadmap candidate drafts, each tied to real metrics and evidence.
  - No issues are auto-created unless policy is explicitly set to apply.
