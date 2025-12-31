# Learning Artifact Lifecycle, Versioning, and Rollback

This lifecycle defines how every learning artifact is versioned, promoted, rolled back, and proven safe. No artifact may operate outside these stages.

## Semantic Versioning Rules

- **MAJOR**: Incompatible behavior or contract changes, new capabilities that can alter decisions, or retrains on materially different data.
- **MINOR**: Backward-compatible improvements, new features behind existing contracts, calibration updates, or prompt tuning that preserves interfaces.
- **PATCH**: Bug fixes, guardrail tightening, documentation-only prompt clarifications, or reproducibility fixes (seeds, deterministic decoding).
- **Compatibility Guarantees**: Action-eligible artifacts must maintain backward-compatible inputs/outputs within a MAJOR series; breaking changes require coordinated migration plans and simulators to validate downstream safety.

## Promotion Stages

| Stage     | Entry Criteria                                                                                              | Evidence Required                                                                                      | Exit Criteria                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Draft     | Registered inventory entry; dataset lineage declared; deterministic/probabilistic classification completed. | Initial evaluation plan and risk note.                                                                 | Baseline metrics captured; no critical policy violations.                                 |
| Evaluated | Baseline tests executed; reproducibility confirmed; bias checks run.                                        | Evaluation report with metrics, cost/perf profile, and bias summary; seed and RNG settings documented. | Meets or exceeds change gates; reviewer sign-off for `action-eligible` artifacts.         |
| Approved  | Governance review completed; rollout plan and rollback point defined.                                       | Signed approval linked in provenance; deployment checklist completed.                                  | Promotion authorized by accountable owner; release candidate prepared.                    |
| Active    | Deployed with monitoring and drift hooks enabled.                                                           | Post-deploy verification, alert routing, and audit record.                                             | Continues to meet drift/quality thresholds; non-conformance triggers automatic downgrade. |

### Required Evidence per Stage

- **Metrics**: Accuracy/utility, calibration, stability, latency, cost, throughput.
- **Bias & Safety**: Demographic parity where applicable, harmful content filters, policy conformance.
- **Operational**: Resource envelope, scaling thresholds, logging/tracing coverage, and feature-flag/kill-switch readiness.
- **Provenance**: PR link, approvers, dataset version hashes, and artifact checksum/signature.

## Promotion Flow (Draft → Evaluated → Approved → Active)

1. **Draft creation**: `scripts/learning/promote_artifact.sh <id> <version> draft <evidence>` registers the artifact and writes status.
2. **Evaluation run**: Execute evaluation suite per `docs/governance/EVALUATION_GATES.md`; attach reports and rerun promotion with stage `evaluated` once thresholds are met.
3. **Approval**: Secure human sign-off (owner + deputy) and rerun promotion with stage `approved`; include rollout and rollback identifiers.
4. **Activation**: Promote to `active` when deployment and monitoring are validated; ensure alerts and drift detectors are active.

## Rollback Guarantees

- **One-command revert**: `scripts/learning/rollback_artifact.sh <id> <target_version>` restores the last known good version and records provenance.
- **Continuity**: Rollback preserves provenance references, prior evidence bundles, and status history under `artifacts/learning/history/`.
- **Safety switches**: Action-eligible artifacts must also expose a feature flag or policy toggle to halt execution while rollback completes.

## Provenance and Signatures

- Status files in `artifacts/learning/status/` must include checksum/signature references for the artifact bundle.
- Tag releases with `learning/<artifact_id>@<version>` for traceable Git provenance.
- Record hashes of prompts/models to ensure reproducibility and detect drift between promotion and deployment.

## Retirement and Archival

- Artifacts that fall below change gates or are superseded move to `simulation-only` status with clear sunset rationale.
- Archive evaluation reports and provenance references for the retention period defined in `AUDITABILITY.md`.

## Exceptions and Escalations

- Any deviation from this lifecycle (e.g., emergency hotfix outside normal approval) requires documented approval from the accountable owner and security council, with a follow-up postmortem and re-certification per `DRIFT_AND_RECERT.md`.
