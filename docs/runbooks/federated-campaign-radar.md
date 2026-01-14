# Federated Campaign Radar Runbook

## Purpose

Deliver privacy-preserving, cross-tenant early-warning for coordinated influence campaigns using
normalized signals, policy-as-code enforcement, and auditable provenance. This runbook is aligned
with the Summit Readiness Assertion and governance constitution to ensure readiness, auditability,
and defensible operations.

## Scope

- Federated signal normalization, privacy envelope creation, and clustering.
- Alert thresholds, response pack generation, and audit ledger recording.
- Governance controls: policy-as-code, compliance logging, and evidence retention.

## Definitions (Authoritative)

- **Signal**: A normalized indicator containing claims, artifacts, actor hashes, and coordination
  features.
- **Federation**: Cross-tenant aggregation of hashed indicators without sharing private content.
- **Governed Exception**: Explicitly approved deviation from standard privacy thresholds with
  documented risk acceptance and policy record.
- **Response Pack**: Disclosure-approved artifacts, summary, and recommended comms playbook for
  action routing.

## Architecture (Federated Campaign Radar)

```mermaid
flowchart LR
  subgraph Tenant[Org / Business Unit]
    A[Local Signal Sources] --> B[Normalization + Hashing]
    B --> C[Privacy Envelope (DP / k-Anon)]
    C --> D[Policy-as-Code Gate]
  end

  D --> E[Federated Aggregator]
  E --> F[Cluster + Confidence]
  F --> G[Early-Warning Engine]
  G --> H[Response Pack Generator]
  H --> I[Audit Ledger]
  H --> J[Alerts + Comms Routing]
```

## Preconditions

- Policy engine enabled with enforcement hooks for federation, privacy budget, and disclosure.
- Immutable audit ledger operational and verified.
- Tenant-level privacy budgets and k-anonymity thresholds configured.
- C2PA verification services available for provenance scoring.
- Incident response and governance escalation paths configured.

## Inputs

- Signal batches (tenant-normalized schema).
- Privacy parameters (epsilon budgets, k thresholds, minimum tenant counts).
- Governance policies (OPA bundles and policy-as-code rules).
- Playbook registry for response pack recommendations.

## Outputs

- Cross-tenant cluster summaries (public artifacts only).
- Early-warning alerts with confidence and provenance annotations.
- Immutable audit trail entries for every decision.
- Response packs with disclosure approvals and action routing metadata.

## Operational Workflow

### 1) Intake & Normalization

1. Validate incoming signal batches against the shared schema.
2. Ensure all actor identifiers and claim text are hashed or public-only.
3. Verify policy compliance for privacy budgets, data minimization, and disclosure.
4. Record intake decision in the audit ledger with policy bundle hash.

**Success Criteria**

- No raw private content is transmitted or stored.
- All tenant identifiers are pseudonymous and rotate per policy.

### 2) Privacy Envelope Creation

1. Apply differential privacy to aggregate counts.
2. Enforce minimum tenant participation thresholds.
3. Mark any exception as a Governed Exception and log to governance ledger.
4. Enforce retention windows to drop stale signals.

**Success Criteria**

- Differential privacy budget enforced at batch-level.
- No cluster released below minimum N-tenant threshold.

### 3) Federated Clustering

1. Match hashed claims/artifacts across tenants.
2. Compute coordination and burst metrics.
3. Propagate confidence using cross-tenant concurrence and provenance signals.
4. Gate cluster release on k-anonymity and minimum-tenant thresholds.

**Success Criteria**

- Clusters include only public artifacts and hashed indicators.
- Confidence computed with provenance weighting.

### 4) Early-Warning Thresholds

Trigger alert when all are true:

- Cross-tenant coordination score exceeds threshold.
- Spread velocity crosses multi-region trigger.
- Minimum provenance confidence met.
- No policy violations in disclosure or privacy budgets.

**Success Criteria**

- Alert includes narrative summary, diffusion channels, and top spreader hashes.
- Alert includes provenance and privacy metadata.

### 5) Response Pack Generation

1. Generate a response pack with public artifacts, narrative summary, and recommended comms playbook.
2. Verify disclosure policy for each artifact.
3. Log the response pack creation and delivery.
4. Attach provenance annotations and policy decision proofs.

**Success Criteria**

- Pack contains only disclosure-approved artifacts.
- Audit ledger includes all artifact IDs and policy decisions.

## Policy-as-Code Controls

- **Disclosure Policy**: blocks release of non-public content.
- **Privacy Budget Policy**: enforces epsilon and k thresholds.
- **Provenance Policy**: requires C2PA verification for confidence elevation.
- **Exception Policy**: records any Governed Exception with signer ID, rationale, and expiry.
- **Retention Policy**: enforces time-bounded signal retention and deletion.

All policy decisions are logged with deterministic inputs and policy version hashes.

## Incident Response

### A) Privacy Threshold Violation

1. Halt federation outputs.
2. Create incident entry in audit ledger.
3. Notify governance and security council.
4. Execute rollback to last compliant policy bundle.
5. Run compliance revalidation before re-enabling federation.

### B) Suspected Poisoning / Sybil Tenant

1. Isolate tenant signals.
2. Lower confidence weights for affected clusters.
3. Run integrity checks against baseline metrics.
4. Record remediation and revalidation results.
5. Require governance sign-off for tenant re-entry.

### C) Provenance Verification Failure

1. Downgrade confidence for affected artifacts.
2. Flag alert with provenance failure tag.
3. Initiate supplemental verification run.
4. Gate release of response packs without verified provenance.

## Threat Model & Controls

| Threat            | Risk                         | Control                                            |
| ----------------- | ---------------------------- | -------------------------------------------------- |
| Signal poisoning  | False cluster confidence     | Tenant reputation weighting, policy-as-code gating |
| Privacy inference | Leakage of sensitive content | DP budget enforcement, k-anonymity thresholds      |
| Sybil tenants     | Inflated campaign signals    | Minimum-tenant requirements, anomaly detection     |
| Policy drift      | Non-compliant disclosure     | Bundle hash validation, audit ledger checks        |

## Observability & SLOs

**Metrics**

- Time-to-detect (TTD) delta vs single-tenant baseline.
- False attribution rate (FAR).
- Cluster confidence calibration score.
- Privacy budget utilization rate.
- Response pack disclosure approval latency.

**Logs & Traces**

- Policy decision logs with policy bundle hash.
- Cluster derivation traces for replay and audit.
- Response pack generation traces with artifact IDs.

**Alerts**

- Privacy budget exhaustion.
- Cluster confidence volatility spikes.
- Audit ledger write failure.
- Policy bundle mismatch or signature failure.

## Evidence & Compliance

- Store signal batch hashes, policy decisions, and cluster outputs in the audit ledger.
- Maintain evidence artifacts for incident reviews and governance audits.
- Retain response pack manifests with disclosure approvals.

## Failure Modes & Recovery

- **Ledger unavailable**: pause federation outputs; resume only after ledger integrity confirmed.
- **Policy bundle mismatch**: block deployment; redeploy approved bundle.
- **DP budget misconfiguration**: revert to baseline config; record Governed Exception if temporary.
- **Response pack delivery failure**: retry with backoff; escalate if SLA breached.

## Escalation Paths

- **Governance**: privacy or policy violations, exception approvals.
- **Security Council**: suspected poisoning, provenance tampering, or data exfiltration risk.
- **Ops On-Call**: availability incidents, ledger write failures, alert pipeline disruption.

## Validation Checklist

- [ ] Schema validation passes for all signal batches.
- [ ] Policy-as-code checks enforced on privacy and disclosure.
- [ ] Audit ledger entries are immutable and replayable.
- [ ] Alerts include provenance annotations and confidence scores.
- [ ] Response packs include disclosure approvals and action routing metadata.

## Deferred/Constrained Items

- Secure enclave or MPC-based embedding matching is **Deferred pending privacy review**.
- Adaptive privacy budget optimizer is **Intentionally constrained** until Tier A verification.
- Cross-tenant graph embedding joins are **Deferred pending governance approval**.

## References

- Summit Readiness Assertion (docs/SUMMIT_READINESS_ASSERTION.md)
- Governance Constitution (docs/governance/CONSTITUTION.md)
- OPA Policy Engine (server/src/data-governance/policy/PolicyEngine.ts)
