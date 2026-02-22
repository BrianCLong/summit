# Agentic Verification Standard (The 80% Problem)

## Summit Readiness Assertion
This standard inherits authority from `docs/SUMMIT_READINESS_ASSERTION.md` and the governance stack
(`docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`). Compliance is required
for any change that materially affects runtime behavior or security posture.

## Goal
Prevent review bottlenecks and comprehension debt by enforcing verification-first evidence, bounded
PR size, and deterministic guardrail artifacts. This standard operationalizes the “80% problem”
finding: rapid code output shifts bottlenecks to review, verification, and assumption drift.

## Core Principle
Verification precedes velocity. Every material change must be reviewable, evidence-backed, and
machine-verifiable.

## Minimal Winning Slice (MWS)
Any PR that materially changes behavior must ship with machine-checkable evidence and stay within
reviewable size/risk budgets, or CI fails.

## Acceptance Tests (MWS)
1. A PR exceeding `MAX_PR_LINES` fails with a clear message and suggested split plan.
2. A PR touching security-sensitive paths must include `evidence/<EVID>.json` with required fields.
3. A PR must include either (a) new/updated tests or (b) a `tests_not_applicable` justification in
   evidence; enforced by CI.
4. CI produces deterministic artifacts in `artifacts/agentic_guardrails/` with stable key ordering
   and no wall-clock timestamps.

## Required Artifacts
- `artifacts/agentic_guardrails/metrics.json`
- `artifacts/agentic_guardrails/report.json`
- `artifacts/agentic_guardrails/stamp.json` (content hash + rules version only)

## Roll-Forward Plan
Guardrails run in warn-only mode by default. Enforcement is activated via
`AGENTIC_GUARDRAILS_ENFORCE=1` after baseline stability is established for N merges. Default is
intentionally constrained to `0` to reduce disruption.

## Evidence Contract
Required evidence schema is defined in:
- `docs/standards/schemas/agentic-evidence.schema.json` (added in PR-2)

Evidence must include:
- `evidence_id` (pattern: `EVID-80P-<area>-<nnn>`)
- `change_summary`
- `success_criteria[]`
- `tests` object: `{ added: bool, updated: bool, not_applicable_reason?: string }`
- `assumptions[]` (required when risk score ≥ threshold)
- `tradeoffs[]`
- `security_impact` (enum: none | low | med | high)

## Claim Registry Mapping
- PR size/review bottleneck gates → ITEM:CLAIM-01, ITEM:CLAIM-02
- Assumption propagation detection + evidence requirements → ITEM:CLAIM-04, ITEM:CLAIM-05
- Comprehension debt metrics + rubber-stamp prevention → ITEM:CLAIM-06, ITEM:CLAIM-07
- Test-first / success-criteria-first workflow scaffolding → ITEM:CLAIM-08
- Greenfield posture + mitigation for mature codebases → ITEM:CLAIM-09
- Everything else → Summit original

## Interop & Standards Mapping
### Imports
- Git diff / changed file list
- PR metadata (title, labels, size)
- Test results (existing pipeline)

### Exports
- `metrics.json`, `report.json`, `stamp.json`
- GitHub Check annotations (fail/warn with remediation steps)

### Non-goals
- Generating code
- Auto-merging PRs
- Storing prompts or model outputs

## Threat-Informed Requirements
- **Threat 1: Rubber-stamping AI code introduces latent security bugs.**
  - Mitigation: evidence-required + tests-required + risk scoring.
  - Gate: guardrails CI job blocks merge when high-risk + missing evidence.
- **Threat 2: Assumption propagation cements wrong premises.**
  - Mitigation: require `assumptions[]` and `tradeoffs[]` when risk ≥ threshold.
  - Gate: schema validation enforces presence.
- **Threat 3: Data leakage via logs or evidence artifacts.**
  - Mitigation: never-log list, redaction patterns, “no prompts stored.”
  - Gate: CI scans evidence output for secret patterns and blocks.
- **Threat 4: Review queue overload.**
  - Mitigation: PR size budgets + suggested split plan.
  - Gate: PR size job fails above budget (warn-only in phase 1).

## Performance & Cost Budgets
- Guardrails runtime ≤ 30s in CI; ≤ 5s locally (best-effort).
- Memory ≤ 200MB.
- `report.json` ≤ 256KB.
- CI job timeout at 2 minutes; failure message includes remediation.

## Data Handling
See `docs/security/data-handling/the-80-problem-in-agentic-coding.md` for never-log and retention
requirements.

## Operational Readiness
See `docs/ops/runbooks/the-80-problem-in-agentic-coding.md` for remediation and SLO guidance.

## MAESTRO Alignment
- **MAESTRO Layers**: Foundation, Data, Tools, Infra, Observability, Security.
- **Threats Considered**: prompt injection, goal manipulation, tool abuse, review bypass, evidence
  forgery.
- **Mitigations**: deterministic artifacts, schema validation, enforcement flag, secret scanning,
  and reviewable PR size budgets.

## Status
This standard is active and enforceable once guardrails are enabled. The path to enforcement is
explicit and governed.
