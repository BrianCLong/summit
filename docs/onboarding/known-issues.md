# Onboarding Known Issues & Mitigations

Use this list when onboarding or preparing a release. Each item names a common
pitfall and the mitigation we expect teams to follow.

## Release Epic Pitfalls

| Epic            | Pitfall                                                                                   | Mitigation                                                                                                                                                                   | Reference                                                       |
| --------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Canary          | Canary rollout looks green, but synthetic probes never ran (silent canary).               | Confirm the canary schedule, run the synthetic probes, and verify the probe report before proceeding. If probes are missing, pause the rollout until the probe job is green. | `docs/release/canary_manager_synthetic_probes_auto_rollback.md` |
| Rollback        | Rollback instructions skip feature-flag backouts or leave data migrations unverified.     | Follow the rollback checklist, explicitly flip feature flags back to the last stable version, and validate DB state with smoke checks before reopening traffic.              | `docs/release/release_steps.md`                                 |
| Disclosure pack | Evidence bundle missing SBOM or release attestations, blocking external disclosure.       | Generate the SBOM and bundle artifacts, then verify the release record includes the full disclosure pack before signing off.                                                 | `docs/release/evidence-bundles.md`                              |
| Drift detection | Contract drift detector fails because specs or routes changed without a refreshed report. | Run the drift detector, update the OpenAPI/spec outputs, and attach the drift report to the release evidence pack.                                                           | `docs/contract-drift-detector.md`                               |

## Reporting & Escalation

- Log onboarding issues in your team channel with the command output and file path.
- Escalate release blockers to the release captain before continuing the train.
