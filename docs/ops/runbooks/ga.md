# GA Readiness Runbook

**Version:** 10.0.0-SINGULARITY-EVENT
**Status:** ACTIVE

## 1. Alerts & Monitoring

| Metric | Threshold | Severity | Response |
| :--- | :--- | :--- | :--- |
| **Agent Action Latency** | p95 > 300ms | P2 | Scale `agent-runtime` replicas; check Graph DB load. |
| **Graph Write Latency** | p95 > 50ms | P2 | Check Neo4j heap; review locking transactions. |
| **Policy Rejections** | Rate > 5% | P1 | Investigate potential agent misalignment or attack. |
| **Provenance Failure** | Count > 0 | **P0** | **HALT RELEASE.** Verify Cosign/OIDC config. |

## 2. Rollback Procedures

If a critical P0 incident occurs post-deployment:

1.  **Identify Bad Artifact:** Check `attestation.json` and `sbom.spdx.json.sig`.
2.  **Revert to Previous Tag:**
    ```bash
    git checkout v9.9.0
    pnpm install
    make deploy
    ```
3.  **Purge Bad Cache:**
    ```bash
    make purge-cache scope=agents
    ```
4.  **Notify Stakeholders:** Update status page and Slack #incidents.

## 3. Blast Radius

- **Agents:** Confined to their authorized namespaces. Policy denies access to `/restricted/*`.
- **Graph:** Write access limited to `Memory` label. Cannot delete `Core` ontology nodes.
- **Secrets:** Keyless OIDC means no long-lived keys to leak.

## 4. Operational Checklist

- [ ] All CI gates passed (SLSA, Tests, Lint).
- [ ] SBOMs generated and signed.
- [ ] Drift detection enabled (`scripts/monitoring/ga-drift.sh`).
- [ ] Support team briefed on CompanyOS SDK FAQs.
