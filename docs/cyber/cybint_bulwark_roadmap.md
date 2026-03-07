# BULWARK CYBINT Modernization Roadmap

**Operating Mode:** CYBINT-Blue  
**Mission Type:** Strategic modernization & tech debt burn-down  
**Objective:** Reduce telemetry/instrumentation debt while advancing cyber defense maturity across detection, response, IAM, infra hygiene, and governance.

## Executive Framing

- Anchor on production-readiness: improvements must tighten MTTR/MTTD, shrink attack surface, and reduce alert fatigue.
- Work in three horizons:
  - **H1 (0–30 days):** quick wins that unblock signal quality and response speed.
  - **H2 (30–90 days):** structural upgrades (schema normalization, SOAR playbooks, IAM tripwires).
  - **H3 (90–180 days):** governance and drift guardrails with measurable control health.
- Success metrics: ≥30% reduction in false positives, ≥40% faster containment on top 5 alerts, ≥50% coverage of ATT&CK tactics with owner-tagged detections, and weekly drift scans at ≥95% completion.

## Epics and Tasks

### Epic 1: Telemetry Unification & Quality Control

Goal: reduce alert fatigue, enable signal fusion, and close blind spots.

1. Inventory all telemetry sources (EDR/NDR/Cloud/IDP/SaaS).
2. Define and tag minimal viable fields (MVFs) for each signal class.
3. Normalize all logs to OpenTelemetry schema.
4. Add classification/retention tags (sensitivity, DPIA required).
5. Build telemetry trust scorecard (freshness, completeness, fidelity).
6. Create drift detection harness (schema + content-level).
7. Pipe all telemetry to a central lake with access-bound views.

### Epic 2: Detection Engineering & Alert Resilience

Goal: replace legacy rules with high-signal, low-maintenance detection strategy.

1. Prioritize threats by risk-to-org × detection gap.
2. Convert legacy SIEM rules to Sigma + test harnesses.
3. Cluster alerts by ATT&CK + campaign overlap.
4. Inject synthetic data to validate detections (CI integration).
5. Track FP/FN rates by rule + telemetry health correlation.
6. Tag all detections with owners + expiration/renew dates.
7. Publish detection coverage heatmap vs ATT&CK.

### Epic 3: Rapid Response Modernization

Goal: make IR fast, verifiable, and scalable across domains.

1. Build SOAR playbooks for top 5 alerts (containment-first).
2. Introduce evidence handling templates & chain-of-custody logs.
3. Define IR comms playbook (exec → legal → ops).
4. Pre-stage containment artifacts (blocklists, disable scripts, network ACLs).
5. Enable single-click asset isolation (via EDR/NDR).
6. Track TTD, TTR, MTTR by alert category.
7. Add tripwire tests to validate IR readiness monthly.

### Epic 4: Identity & Access Tripwire Framework

Goal: lock down identity layer while inserting high-fidelity tripwires.

1. Enforce MFA everywhere + conditional access.
2. Map all user/app/service accounts with privileges.
3. Insert honeytokens in sensitive groups & mail rules.
4. Introduce step-up auth for high-risk actions.
5. Log all identity events with ABAC tags (why/who/where).
6. Deploy risk-based session scoring engine.
7. Alert on lateral movement + credential artifacts.

### Epic 5: Infrastructure & Exposure Hygiene

Goal: shrink attack surface, enforce baseline configs, and remove zombie risk.

1. Map all internet-exposed assets + auto-expire test/dev.
2. Enforce baseline config packs (CIS/NIST) via IaC drift tools.
3. Inventory all secrets in code/config → rotate high-risk ones.
4. Gate infra deploys on SLSA/SBOM + signed attestation.
5. Track unused ports/services by env → auto-suppress/remove.
6. Set max lifetime for exposed public links/shares (SaaS).
7. Reclaim orphaned DNS/cloud/storage entries.

### Epic 6: Governance, Risk, and Drift Guardrails

Goal: embed compliance & hardening into daily dev/sec/ops flow.

1. Deploy OPA policy bundles for cloud/CI/CD with deny-by-default.
2. Define ABAC/RBAC policies as code, with tests.
3. Track all exceptions with expiry + escalation rules.
4. Create risk → control → owner mappings.
5. Automate weekly drift scans against desired state.
6. Conduct tabletop tests for top 3 residual risks.
7. Build live scoreboard: control coverage, risk delta, alert fidelity.

## Execution Notes

- Pair each task with measurable outcomes (e.g., MVF adoption %, ATT&CK coverage delta, drift SLOs).
- Gate merges on detection tests (synthetic data) and policy-as-code checks.
- Maintain owner tags and renewal dates for all detections and exceptions to prevent silent decay.
