# 2027 Risk Register (v1)

## Structure

Each risk contains: trigger signals, owner, likelihood, impact, mitigation, evidence artifacts, and stage gate mapping.

## Risks

1. **Security incident / supply chain compromise**
   - Triggers: CVE backlog > SLA; unsigned dependency; anomalous signing events; SBOM freshness >30d.
   - Owner: Security Lead
   - Mitigation: Mandatory provenance receipts for builds; weekly SBOM regeneration; dependency allowlist; attack surface scans; DR playbooks validated quarterly.
   - Evidence: SBOM digests, signing receipts, DR drill reports.
   - Gates: Trust readiness (verification tools + trust center snapshot) before release.

2. **Runaway COGS / margin erosion**
   - Triggers: Cost per inference > budget; anomaly detection alerts; cloud discounts not realized.
   - Owner: FinOps Lead
   - Mitigation: Real-time metering + cost guardrails; autoscaling policies; reserved capacity plan; per-tenant cost dashboards; staged rollout with canary budgets.
   - Evidence: Cost guardrail dashboards, anomaly receipts, pre/post optimization reports.
   - Gates: Revenue readiness (pricing enforcement) and Operate gate cost guardrail checks.

3. **Enterprise procurement drag**
   - Triggers: Deal cycle > 90 days; missing compliance artifacts; networking exceptions.
   - Owner: Enterprise PM
   - Mitigation: Pre-built trust packets (attestations, DR proofs, SBOM); private networking/BYOK reference architectures; procurement playbooks; automated NDA/MSA review via policy engine.
   - Evidence: Trust center snapshots, residency design approvals, procurement checklist receipts.
   - Gates: Enterprise readiness gate before contracting.

4. **Ecosystem quality issues**
   - Triggers: Adapter defect rate; SLA breach frequency; security scan failures; CSAT < 4.2.
   - Owner: Ecosystem PM
   - Mitigation: Verified publisher program; mandatory security scans and provenance receipts; kill-switch/rollback automation; quality scorecards surfaced in marketplace.
   - Evidence: Adapter scan reports, rollback receipts, quality dashboards.
   - Gates: Trust readiness + Package gate for marketplace listings.

5. **Multi-region complexity**
   - Triggers: Cross-region replication lag > target; incident blast radius; residency policy drift.
   - Owner: SRE Lead
   - Mitigation: Chaos and DR drills; residency policy conformance tests; failover runbooks; region-level error budgets; topology simulator before expansion.
   - Evidence: DR drill receipts, conformance test results, latency/lag dashboards.
   - Gates: Prove gate requires multi-region SLO validation; Operate gate enforces regression monitors.

## Governance

- All risks tracked with Decision Receipts linking mitigation evidence.
- Quarterly review tied to Board Pack Lite with status (green/yellow/red) and updated triggers.
- Mitigation tasks mapped to OKRs and budget lines; deviations require sign-off.
