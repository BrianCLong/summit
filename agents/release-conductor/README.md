# Release Conductor Agent

A multi-agent orchestration framework for managing MVP-3 → GA releases with progressive delivery, hard gates, immutable evidence, and hands-free rollback.

## Overview

The Release Conductor orchestrates 60+ specialized agents across 8 phases to deliver production releases with:

- **Progressive Delivery**: Canary 10→50→100 with auto-rollback
- **Hard Gates**: Policy-gated promotion (SLO, perf, supply chain, migrations, DR)
- **Immutable Evidence**: Signed artifacts, SBOM, SLSA provenance
- **Full Observability**: OTEL traces, Prometheus metrics, structured JSON logs

## Quick Start

```bash
# Initialize a new release
pnpm release-conductor init --version=v3.0.0

# Validate prerequisites
pnpm release-conductor validate --phase=P0

# Execute orchestration
pnpm release-conductor run --phase=P1 --evidence

# Promote to production
pnpm release-conductor promote --canary=10
```

## Documentation

| Document | Description |
|----------|-------------|
| [MVP3_GA_ORCHESTRATION_V4.md](./MVP3_GA_ORCHESTRATION_V4.md) | Complete v4 ULTRA orchestration prompt |

## Phases

| Phase | Name | Key Agents | Gate |
|-------|------|------------|------|
| P0 | Readiness | CI/CD, Platform, InfraSec, Supply-Chain | supply_chain, policy_ci, hardening |
| P1 | Baselines & Previews | SLO, Probe, Dashboard, Cost/FinOps | slo, perf, preview_budget |
| P2 | Data Safety | Schema, Data Plane, Contracts, Backfill | migrations, tenant_isolation |
| P3 | Security & Compliance | Identity, AuthZ, Audit, Secrets | identity, authz, audit |
| P4 | Product GA Tracks | Realtime, Reporting, Search, Ingest | product_slos, reindex_parity |
| P5 | DR/Chaos | DR/BCP, Chaos, Incident Commander | dr, chaos |
| P6 | Release Train | Release Conductor, Evidence Notary | all_required_gates |
| P7 | Alerts/Runbooks/Docs | Alert, Runbook, Docs | alert_hygiene, doc_lint |
| P8 | GA Flip & KPI | Conductor, QE, SLO Economist | — |

## Agent Roster (60+)

### Executive & Program (A1-A4)
- Release Conductor, Program Scheduler, Evidence Notary, Risk Officer

### CI/CD & Platform (A5-A10)
- CI/CD Engineer, Platform/DevOps, Cost/FinOps, InfraSec, Policy Gatekeeper, Artifactory Steward

### Observability & SLO (A11-A14)
- SLO Librarian, Probe Master, Dashboardsmith, Log Curator

### Security & Compliance (A15-A20)
- Supply-Chain Lead, AppSec, Compliance Officer, Identity/SSO, AuthZ Author, Auditor

### Data/Migrations (A21-A25)
- Schema Captain, Data Plane Owner, Data Contracts Engineer, Backfill Marshal, Shadow Reader

### Performance & Reliability (A26-A29)
- Perf Engineer, Capacity Oracle, Resilience Wrangler, Infra Load-Tester

### Product Tracks (A30-A34)
- Realtime Maestro, Reporting Smith, Searchkeeper, Ingest Quartermaster, API Contract Custodian

### DR/Chaos/Incidents (A35-A38)
- DR/BCP Lead, Chaos Captain, Incident Commander, Forensic Scribe

### Runbooks/Alerts/Docs (A39-A42)
- Alert Arborist, Runbook Editor, Comms Bard, Docs Librarian

### Quality & UX (A43-A45)
- QE Generalist, Visual/Accessibility QE, Mobile/Edge QE

### Governance & Finances (A46-A48)
- CAB Secretary, FinReporter, Vendor Sentinel

### SecOps/Red-Blue (A49-A50)
- Red Team Sprinter, Blue Team Sentinel

### Developer Experience (A51-A53)
- Template Keeper, Lint Marshal, Preview Concierge

### Reliability Economics (A54-A55)
- SLO Economist, Feature Flag Butler

### Data Governance (A56-A57)
- Purge Marshall, PII Scrubber

### Toolchain Safety (A58-A60)
- Secrets Escrow, Provenance Sheriff, Evidence QA

## Global Guardrails

All agents must adhere to:

1. **Supply Chain**: SBOM (SPDX), SLSA provenance, cosign signatures
2. **Security**: OPA RBAC/ABAC, hash-chained audit, zero plaintext secrets
3. **Delivery**: Canary with auto-rollback on SLO breach
4. **Data**: Multi-tenant isolation (RLS), retention/purge compliance
5. **Observability**: OTEL + Prometheus + JSON logs with release context
6. **Evidence**: Signed packs, 1-year retention, reason-for-access logging

## Evidence Pack

Each release produces a signed evidence pack containing:

```
evidence.zip
├── sbom/*.spdx.json           # Software Bill of Materials
├── attestations/*.intoto.jsonl # SLSA provenance
├── signatures/*.sig            # Cosign signatures
├── slo/*.png                   # SLO dashboard snapshots
├── perf/*.json                 # Performance baseline/headroom
├── migrations/*.json           # Schema migration evidence
├── dr/*.json                   # DR drill results
├── chaos/*                     # Chaos engineering results
├── alerts/hygiene.json         # Alert coverage
├── identity/*.json             # Auth decision logs
├── release_notes.md            # Version release notes
└── approvals_matrix.json       # CAB approvals
```

## Integration with Summit

This release conductor integrates with:

- **Multi-LLM Orchestrator** (`agents/orchestrator/`): For AI-assisted operations
- **CI/CD Pipelines** (`.github/workflows/`): Automated checks and deployments
- **Observability Stack** (`observability/`): Metrics, logs, traces
- **Policy Engine** (`services/policy/`): OPA-based authorization

## Related Documentation

- [Release Process](../../docs/deployment/RELEASE_PROCESS.md)
- [Feature Flags](../../docs/deployment/FEATURE_FLAGS.md)
- [DR System](../../docs/disaster-recovery/COMPREHENSIVE_DR_SYSTEM.md)
- [SLO Policy](../../docs/SLO_POLICY.md)

## License

MIT
