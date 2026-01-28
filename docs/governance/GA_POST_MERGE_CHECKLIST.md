# GA Post-Merge Verification Checklist

**Role:** Release Captain
**Trigger:** Immediately after `ga-risk-gate` workflow completes on `main` merge.
**SLA:** 15 minutes.

## 1. Governance Gate Workflow Verification

- [ ] **Workflow Success**: Verify the `GA Risk Gate` workflow run is **GREEN** (Success).
  - [ ] Link: `https://github.com/BrianCLong/summit/actions/workflows/ga-risk-gate.yml`
- [ ] **Artifacts Generated**: Verify the following artifacts are attached to the run:
  - [ ] `sbom.cdx.json` (CycloneDX SBOM)
  - [ ] `trivy-results.json` (Secrets Scan)
  - [ ] `grype-results.json` (Vulnerability Scan)
- [ ] **Log Verification**:
  - [ ] Search logs for: `✅ OIDC Environment Detected` (Cosign Readiness).
  - [ ] Search logs for: `GA Freeze Window is ACTIVE` (Must **NOT** appear, unless intentional freeze).

## 2. CI/CD Health Check

- [ ] **Main Branch Status**: Verify the `ci.yml` run triggered by the merge is **GREEN**.
- [ ] **Merge Queue**: Verify `pnpm pr:triage` shows the queue is processing (not stalled).
- [ ] **No Unexpected Failures**: Check that no *new* flakes were introduced (compare with previous run).

## 3. Evidence Collection

- [ ] **Snapshot**: Capture the "Clean Run" URL for the `ga-risk-gate` workflow.
- [ ] **Record**: Log this run in the [Release Evidence Index](../evidence/EVIDENCE_INDEX.md) (or equivalent tracker).

## 4. Troubleshooting (If Red)

- [ ] **Artifact Missing?** Check `Upload Artifacts` step logs.
- [ ] **Scan Failure?** Check `Fail on scan errors` step. If false positive, add to [Exception Ledger](./GOVERNANCE_EXCEPTION_LEDGER.md).
- [ ] **OIDC Failure?** Check AWS/GCP Identity Provider configuration.
