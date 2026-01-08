# Stage Gates 2.0 (Spec → Build → Prove → Operate → Package)

## Gate Overview

- **Spec**: Problem + success metrics defined; Decision Receipt captured; KPI contracts aligned.
- **Build**: Instrumentation, policies, and controls implemented with tests and receipts.
- **Prove**: Evidence collected in staging; trust, revenue, and enterprise readiness verified.
- **Operate**: Runbooks, SLOs, DR drills, and monitoring active; receipts show stability.
- **Package**: Externalized artifacts (docs, trust center snapshot, invoice pack) published.

## Checklist by Gate

### Spec

- OKR alignment + KPI tree mapping.
- Data contracts for metering and receipts defined.
- Owners + budgets assigned; risk linkage established.

### Build

- Tests: unit/integration + policy tests passing; coverage ≥80% for new logic.
- Instrumentation: metrics, traces, and receipts emitting for critical paths.
- Security: SBOM refreshed; dependency policy enforced; threat model updated.

### Prove

- **Revenue readiness**: Pricing enforcement on; entitlement checks + invoice pack receipts validated; sample invoices reviewed.
- **Trust readiness**: Verification tools (signing, SBOM, attestations) exercised; trust center snapshot produced.
- **Enterprise readiness**: Private networking/BYOK/residency proofs demonstrated; latency and SLOs validated in target regions.
- DR drill executed with receipts; rollback plans rehearsed.

### Operate

- Error budgets monitored with burn alerts; MTTR/MTBF tracked.
- Capacity guardrails active (autoscaling, anomaly detection, cost ceilings).
- On-call runbooks and escalation policies updated; chaos drills scheduled.
- Marketplace safeguards (kill-switch, rollback) enabled for adapters.

### Package

- Documentation finalized (user guides, runbooks, procurement packet).
- Trust center snapshot + evidence bundle published.
- Billing/export feeds validated; revenue share automation receipts attached where relevant.
- Stage gate Decision Receipt updated with evidence links.

## Evidence Bundle Template

- KPI dashboards + exports (ARR, margin, reliability, security, ecosystem).
- Receipts: build signing, policy enforcement, invoice pack, trust center snapshots.
- Test reports and coverage.
- DR/chaos drill outputs.
- Risk register alignment and mitigations status.
