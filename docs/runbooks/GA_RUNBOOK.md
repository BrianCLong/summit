# GA Operational Runbook

## P1 Incident Response
*   **Declare:** Within 15 minutes of detection.
*   **Action:**
    1.  Freeze pipeline.
    2.  Notify affected tenants.
    3.  Rotate keys if data risk.
*   **RCA:** Must be completed within 72 hours.

## Drift Response
*   **Trigger:** Entropy Spike ≥ threshold.
*   **Action:**
    1.  Enable `ephemeral_frame_detector`.
    2.  Run A/B test.
    3.  Ship prompt patch within 24 hours.

## DSR Flow (Data Subject Request)
1.  Export hashed event IDs.
2.  Identify matching audit records.
3.  Purge raw data within SLA.

## Rollback Procedure
1.  Flip feature flag (e.g., `detector_v3: false`).
2.  Replay last 24h with prior stable model.
3.  Verify parity.
4.  Reopen traffic.

# GA Launch Checklists

## 1. Pre-GA Readiness (T-2 Weeks)

*   [ ] **Security Audit:**
    *   Run `opa eval -i report.json -d .github/policies/ga-evidence.rego "data.ga_evidence.deny"`.
    *   Verify no critical vulnerabilities in `report.json`.
    *   Confirm all container images have SBOMs.
*   **Load Testing:**
    *   Run load tests against staging environment.
    *   Verify p99 latency < 500ms at peak load.
    *   Verify error rate < 0.1%.
*   **Observability:**
    *   Confirm logs contain `correlationId` and `agentId`.
    *   Verify `/health` endpoints are reachable and return `status: healthy`.
    *   Verify alerts are configured for P1/P2 incidents.

## 2. GA Cut (Release Day)

*   [ ] **Tagging:**
    *   Create release tag (e.g., `v1.0.0`).
    *   Ensure CI pipeline triggers release build.
*   **Evidence Verification:**
    *   Download evidence bundle.
    *   Verify provenance and signatures:
        ```bash
        cosign verify-blob --bundle <bundle.pem> --signature <signature.sig> <artifact>
        ```
    *   Check OPA policies pass for the release artifact.
*   **Deployment:**
    *   Deploy to production.
    *   Run smoke tests.
    *   Monitor error rates and latency for 1 hour.

## 3. Post-GA Hypercare (T+2 Weeks)

*   [ ] **Monitoring:**
    *   Review daily SLO reports.
    *   Monitor support channels for user issues.
*   **Incident Response:**
    *   Daily standup to review any incidents.
    *   Prioritize bug fixes for GA critical path.
