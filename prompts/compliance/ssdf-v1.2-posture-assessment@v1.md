# Prompt: SSDF v1.2 Posture Assessment & Comment Draft

## Objective

Produce Summit SSDF v1.2 posture artifacts, CI hardening blueprint, and a submission-ready public comment letter with evidence-first controls.

## Required Outputs

1. `docs/compliance/SSDF_v1.2_CONTROL_MAP.json`
2. `docs/compliance/SSDF_v1.2_GAPS_AND_EXCEEDS.md`
3. `docs/architecture/SSDF_DERIVED_CI_BLUEPRINT.md`
4. `docs/standards/NIST_SP_800_218_R1_PUBLIC_COMMENT.md`
5. `docs/standards/NIST_COMMENT_SUBMISSION_CHECKLIST.md`
6. Update `docs/roadmap/STATUS.json` with a revision note.
7. Record decision in `packages/decision-ledger/decision_ledger.json` with rollback plan.

## Constraints

- Align to governance authority chain: `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`, and `docs/SUMMIT_READINESS_ASSERTION.md`.
- Map each SSDF practice and task to Summit controls, CI enforcement, and evidence artifacts.
- Include MAESTRO security alignment (layers, threats, mitigations) in the CI blueprint.
- Use deterministic filenames and ensure artifacts are audit-ready.
