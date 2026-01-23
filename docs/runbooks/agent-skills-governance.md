# Agent Skills Intake & Governance Runbook

## Purpose

Establish a governed, repeatable process for evaluating and integrating external agent skills
packs (e.g., Vercel Labs Agent Skills) into Summit workflows while preserving the Summit
Readiness Assertion and constitutional governance posture.

## Authority & Alignment

- **Summit Readiness Assertion:** Integration is permitted only as a managed exception under
  certified readiness controls; deviations must be recorded as **Governed Exceptions**.
- **Summit Constitution:** Governance supremacy, human primacy, and provenance/auditability are
  mandatory and override automation or speed concerns.
- **Policy-as-Code Requirement:** Any regulatory/compliance logic must be expressed as policy-as-code
  before acceptance.

## Scope

- Applies to **all third-party agent skills** or instruction packs that alter coding guidance,
  review behavior, or refactoring logic.
- Covers evaluation, sandboxing, evidence capture, approval gates, and rollout checkpoints.

## Triggers

- New skill pack discovery or requested adoption.
- Updates to an existing skill pack.
- Incidents or regressions attributed to agent-guided behavior.

## Preconditions

- Request recorded with source repository, version/tag, and hash.
- Confirmed ownership and licensing posture.
- Risk classification assigned (low/medium/high).

## Procedure

### 1) Intake & Source Verification

1. Record the source repository URL, release tag, and commit hash.
2. Capture licensing and usage constraints in the request record.
3. Validate integrity of any downloadable artifact (hash match required).

### 2) Governance Mapping

1. Map each rule to Summit authority files and relevant policy-as-code constraints.
2. Identify any rule that conflicts with governance, provenance, or human authorization
   requirements; mark as **Governed Exception** or **Rejected**.
3. Ensure no rule introduces non-auditable automation or bypasses policy checks.

### 3) Security & Compliance Review

1. Confirm no private regulatory language is introduced.
2. Confirm any compliance-impacting rule is represented in policy-as-code and is reviewable.
3. Record compliance review in evidence store (see Evidence Capture).

### 4) Staging & Sandbox Validation

1. Load skills in sandbox-only mode.
2. Execute controlled review/refactor trials against representative code samples.
3. Capture metrics: false positives, false negatives, change risk score, and
   performance impact on reviews.

### 5) Approval Gate

1. Require human owner approval per CODEOWNERS and governance policy.
2. Confirm review artifacts are stored and indexed.

### 6) Rollout

1. Gradual enablement by team or repository scope.
2. Monitor for regressions and policy violations.
3. Freeze and rollback if governance drift is detected.

## Evidence Capture (Receipts)

- Record evidence in `COMPLIANCE_EVIDENCE_INDEX.md` and link to the receipt ID(s).
- Store receipts in `server/src/receipts` and ensure processing by `services/receipt-worker`.
- Required artifacts:
  - Intake record (source, hash, license).
  - Governance mapping results (accepted/rejected rules).
  - Sandbox validation report and metrics.
  - Approval sign-offs and CODEOWNERS reference.

## Governed Exceptions

Any deviation from Summit readiness, governance, or policy-as-code requirements must be
explicitly documented as a **Governed Exception** with owner sign-off and rollback plan.

## Exit Criteria

- Evidence receipts are captured and indexed.
- Governance mapping completed with no unresolved conflicts.
- Human approvals recorded.
- Rollout status recorded (enabled, staged, or rejected).
