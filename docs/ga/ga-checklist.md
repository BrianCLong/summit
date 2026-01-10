# GA Readiness Checklist

This checklist is the authoritative gate for promoting Summit to General Availability. Each item must be completed with evidence linked in the referenced documents. No exceptions are permitted.

## Entry Criteria

- [ ] **Scope lock confirmed** with stakeholders documented in the [board one-pager](board-one-pager.md) and [committee report](committee-report-wolfs-hand.md).
- [ ] **Constitutional compliance affirmed** per [Meta-Governance Framework](../governance/META_GOVERNANCE.md) and [Living Rulebook](../governance/RULEBOOK.md).

## Governance and Risk

- [ ] **Data classification and handling controls** applied according to the [Constitution](../governance/CONSTITUTION.md) and [data retention policy](../governance/data-retention-policy.md).
- [ ] **Risk register and mitigations** updated in the [high-risk registry](../governance/highrisk-registry.md) with owners and due dates.
- [ ] **Audit trail coverage** validated for all GA user journeys per [cross-repo governance](../architecture/cross-repo-governance.md).

## Security and Privacy

- [ ] **Control alignment** completed against the [Advanced Security Platform](../security/ADVANCED_SECURITY_PLATFORM.md) and [CIS Controls Checklist](../security/CIS_CONTROLS_CHECKLIST.md) with evidence captured.
- [ ] **Identity, authz, and secrets posture** verified using [AUTH matrix](../security/AUTH_MATRIX.md) and [secrets governance](../security/SECRETS_GOVERNANCE.md); no hardcoded credentials.
- [ ] **Vulnerability window** closed: latest scans triaged/remediated per [remediation map](../security/REMEDIATION_MAP.md); zero Sev1/Sev2 exposures open.

## Architecture, Reliability, and Observability

- [ ] **Topology alignment** confirmed against the [architecture overview](../architecture/README.md) and [system map](../architecture/system-map.png); deviations documented.
- [ ] **Resilience targets** satisfied: SLOs from [phase2-slo-observability](../architecture/phase2-slo-observability.md) are met in staging with alerting enabled.
- [ ] **Feature flag and blast radius controls** configured per [CONFIGURATION_AND_FLAGS](../architecture/CONFIGURATION_AND_FLAGS.md) and [blast radius report](../architecture/blast-radius-report.txt).

## Streaming Readiness

- [ ] **Pipeline health** validated against [streaming architecture](../streaming/ARCHITECTURE.md) with throughput/batch benchmarks recorded.
- [ ] **Ordering, replay, and DLQ policies** reviewed per [streaming readiness guide](../streaming/README.md); chaos tests executed with acceptable loss budgets.

## Data and Privacy-by-Design

- [ ] **Data lineage** confirmed in [provenance ledger](../architecture/prov-ledger.md); all GA events emit immutable audit records.
- [ ] **PII handling** adheres to [data sensitivity and redaction](../governance/data-sensitivity-and-redaction.md); encryption-in-transit and at-rest verified.

## Release and Cutover

- [ ] **Release plan** approved following [release steps](../release/release_steps.md) with canary/rollback defined in [synthetic probe playbook](../release/canary_manager_synthetic_probes_auto_rollback.md).
- [ ] **Quality bar** met using [release QA template](../release/quality-template.md); blocking defects resolved.
- [ ] **Supply-chain evidence bundle generated and verified** via `pnpm ga:verify` (invokes `node scripts/ga/verify-evidence-bundle.mjs --dir release-artifacts`). Expected outputs: `release-artifacts/sbom.json`, `release-artifacts/provenance.json`, `release-artifacts/checksums.txt`. Passes only when hashes match and files parse cleanly.
- [ ] **Communications** scheduled per [exec go/no-go runbook](exec-go-no-go-and-day0-runbook.md) with command structure named.

## Post-GA Operations

- [ ] **Runbooks and on-call** updated in [operational readiness framework](../OPERATIONAL_READINESS_FRAMEWORK.md) with paging tested.
- [ ] **KPIs and telemetry** wired to dashboards listed in [AI governance dashboard](../governance/AI-GOVERNANCE-DASHBOARD.md); owners assigned.
- [ ] **Customer success readiness**: training, FAQs, and support pathways published in [customer launch announcement](customer-launch-announcement.md).

**Promotion rule:** GA is authorized only when every checkbox is completed and evidence links remain current.
