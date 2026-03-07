# SUI Implementation Plan and Merge-Readiness Stack

## Golden-path merge target

This plan operationalizes PR-1..PR-6 into merge-ready slices with explicit acceptance criteria,
rollback instructions, and evidence requirements.

## PR sequence with acceptance gates

| PR   | Scope                                                      | Acceptance criteria                                                     | Required evidence                                   |
| ---- | ---------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------- |
| PR-1 | `services/sui-api` scaffold + determinism/evidence libs    | `/score` stub returns schema-valid response; evidence artifacts emitted | `sui_smoke` bundle + schema validation log          |
| PR-2 | Graph schema + provenance + leaked/attack-surface features | Deterministic feature extraction hash stable across reruns              | `feature_snapshot.json` + determinism check output  |
| PR-3 | TIDE-like model + explainability                           | Lift and calibration metrics generated; model card exists               | `metrics.json` with quintile lift + `model_card.md` |
| PR-4 | CVE exploit prediction + ranking                           | Fixed fixtures produce stable top-N list by seed                        | `cve_rankings.json` + precision@k report            |
| PR-5 | Underwriting/drift/remediation agents                      | E2E fixture flow runs with deterministic action queue                   | `underwriting_packet.json` + action audit trail     |
| PR-6 | Governance/security hardening                              | Policy, SBOM, provenance, and release gates pass                        | SBOM + signed attestations + gate summary           |

## CI gate contract

1. `scripts/check-boundaries.cjs` must pass.
2. OpenAPI and JSON schema files must validate.
3. Evidence schemas and sample artifacts must validate.
4. Determinism test must pass with fixed seed.
5. Security scan and SBOM generation must pass for GA-critical PRs.

## Rollback model

- Each PR remains independently reversible.
- Rollback trigger taxonomy:
  - `determinism_regression`
  - `policy_gate_regression`
  - `security_control_regression`
  - `slo_regression`
- Rollback process:
  1. Pin previous model/service version.
  2. Replay last known-good snapshot.
  3. Re-run UDR-AC and publish corrective evidence bundle.

## Reviewer checklist

- [ ] Scope constrained to one primary zone.
- [ ] PR metadata block included and valid.
- [ ] Required evidence bundle attached and schema-valid.
- [ ] Rollback steps executable and tested.
- [ ] No policy bypasses or undocumented exceptions.

## State-of-the-art enhancement

**Forward-leaning addition:** deterministic feature memoization cache keyed by
`tenantId:snapshotId:modelVersion:seed` to eliminate redundant recomputation in quote refresh loops
while preserving reproducibility constraints.
