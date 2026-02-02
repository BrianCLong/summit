# Recommended Next Actions (Weekly Conveyor)

**Date**: 2026-01-25
**Context**: Post-GA Stabilization & Governance Hardening

## 1. High-Leverage Technical Hardening (Claude Code)
**Goal**: Automate the Governance Drift Detection to prevent manual toil.

```text
You are tasked with implementing the "Governance Drift Detector" as a GitHub Actions workflow.
Reference the runbook at `docs/governance/runbooks/ga-ops-drift.md`.
1. Create a new workflow `.github/workflows/governance-drift.yml`.
2. Schedule it to run every Monday at 08:00 UTC.
3. Implement the detection logic:
   - Check for changes in `.github/workflows/ga-risk-gate.yml` and `docs/policies/trust-policy.yaml` since the last release tag.
   - If changes are found without a corresponding `governance-approved` label in the commit history, fail the workflow.
   - Send a notification (mocked echo) to the #governance-alerts channel.
4. Ensure the workflow has read-only permissions.
```

## 2. CI Flake Reduction & Gate Repair (Antigravity)
**Goal**: Stabilize the Merge Queue by addressing the most common "False Positive" blockers.

```text
Analyze the `check-ga-policy.sh` script and the `ga-risk-gate.yml` workflow.
1. Identify any network-dependent steps (e.g., fetching remote policies or CVE databases) that lack retry logic.
2. Wrap these commands in a `retry` function with exponential backoff.
3. specifically, ensure `trivy` and `grype` executions are robust against temporary registry failures.
4. Output a diff that applies these stability fixes to `scripts/check-ga-policy.sh`.
```

## 3. Evidence Automation & Documentation Enforcement (Qwen)
**Goal**: Eliminate "Evidence Staleness" drift by automating the weekly artifact generation.

```text
We need to automate the "Evidence Freshness" requirement from the Weekly GA Ops Snapshot.
1. Create a script `scripts/automate-evidence-refresh.sh`.
2. The script should:
   - Run `generate-sbom.sh` (or equivalent syft command) to update `sbom-mc-v0.4.5.json`.
   - Run `slsa-provenance.sh` (or equivalent) to update `pr-provenance.json`.
   - Sign both artifacts using the existing `cosign` setup (mock the key path if needed).
   - Check if the generated files differ from the committed versions.
   - If different, output a message instructing the user to commit the updates.
3. Update `docs/governance/EVIDENCE.md` to reference this new automation script.
```
