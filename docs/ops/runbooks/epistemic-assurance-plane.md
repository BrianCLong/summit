# Epistemic Assurance Plane Runbook

## Alerts

1. **Drift Detector Alert: Approval Rate**
   - **Condition**: Discrepancy between current approval rate and historical average > 15%.
   - **Action**: Check if policy definitions in `.opa/policy/` have been altered. Revert changes if unauthorized. Examine recent OSINT leads for unusually poor evidence.

2. **Drift Detector Alert: Support Score**
   - **Condition**: Discrepancy between current average support score and historical average > 10%.
   - **Action**: Review ingestion agents. Data sources might be degraded, or new reliable sources are skewing results higher.

3. **High Block Rate: Missing Evidence**
   - **Condition**: Spike in "missing_evidence" rationales.
   - **Action**: Verify the OSINT ingestion pipeline. Ensure Evidence nodes are correctly linked to EpistemicClaims.

4. **Provenance Write Failure**
   - **Condition**: Maestro fails to write `ProvenanceStep`.
   - **Action**: Check IntelGraph connection and permissions.

## Emergency Mitigation

- If the assurance plane blocks critical operations incorrectly, temporarily disable the `osint-high-impact` policy requirement by returning default approvals in `evaluateEpistemicIntent` behind a feature flag (Requires executive approval).
