# Multi-Agent Release Orchestration — IntelGraph v5.0.0

## Overview

This document defines the multi-agent orchestration protocol for promoting IntelGraph
from MVP-3 to General Availability (GA). It describes the agents, phases, gates,
and evidence requirements for a safe, auditable release.

## Release Parameters

| Parameter | Value |
|-----------|-------|
| Repository | `BrianCLong/summit` |
| Target Version | `v5.0.0` |
| Integration Branch | `claude/merge-prs-ga-release-XjiVk` |
| PRs Merged | 597 |
| Environments | dev → staging → production |

## Phase Summary

```
P0 Readiness ──→ P1 Gates & Baselines ──→ P2 Data Safety ──→ P3 Security
     │                    │                      │                  │
     ▼                    ▼                      ▼                  ▼
  CI checks          SLO probes            Migration gate      OPA + AuthZ
  Supply chain       Perf baseline         RLS + pgBouncer     Audit trail
  Container harden   PR previews           Index catalog       OIDC/SCIM
                                                                   │
P4 Product GA ◄────────────────────────────────────────────────────┘
     │
     ▼
P5 DR/Chaos ──→ P6 Release Train ──→ P7 Alert Hygiene ──→ P8 GA Flip
     │                  │                    │                  │
  Failover drill    RC tag + canary      Runbook coverage   KPI review
  Chaos evidence    10→50→100% rollout   Noise reduction    Flag flips
```

## Agent Roster

| # | Agent | Responsibility | Key Artifacts |
|---|-------|---------------|---------------|
| 1 | Release Conductor | Drive phases, verify gates, compile evidence | evidence.zip, release notes |
| 2 | CI/CD Engineer | Workflows, preview infra, caching | .github/workflows/* |
| 3 | DevOps/Platform | Helm/Terraform, pod security, HPA | helm/, terraform/ |
| 4 | SLO/Observability | Golden paths, dashboards, SLO burn alerts | grafana/, prometheus/ |
| 5 | Supply Chain & Security | SBOMs, SLSA, cosign, vuln budgets | SBOMs, attestations |
| 6 | Schema/Migrations | Expand/contract, shadow reads, rollback | migration artifacts |
| 7 | Data Plane Owner | Postgres/Neo4j/Redis readiness | RLS, index catalog |
| 8 | Flags & Rollout | Typed SDKs, auto-ramp, kill-switch | feature flag config |
| 9 | AuthZ/Compliance | OPA RBAC/ABAC, step-up auth, decision logs | policy/, audit logs |
| 10 | DR/BCP Lead | Cross-region backups, failover drills | DR evidence |
| 11 | Perf Engineer | k6 models, headroom analysis, HPA tuning | perf reports |
| 12 | Realtime | WS + SSE fanout, ordered delivery | subscription config |
| 13 | Reporting/PDF | Playwright render, redaction, signing | report templates |
| 14 | Search/Typesense | Schema versioning, alias reindex | search config |
| 15 | Ingest/ETL | Backpressure, DLQ, replay | ingest config |
| 16 | Chaos Captain | Stage chaos, canary rollback drills | chaos experiments |
| 17 | Runbook & Alert Arborist | Alert-to-runbook mapping, noise reduction | runbooks/ |

## Gate Definitions

### P0 Gate: Readiness
- [ ] `container-hardening` check green
- [ ] `supply-chain-gates` workflow passing
- [ ] `policy-ci` (OPA tests) passing
- [ ] CODEOWNERS enforced
- [ ] Conventional commits enforced

### P1 Gate: Baselines
- [ ] `slo-gates` passing (golden path probes)
- [ ] `performance-gate` passing (k6 baselines recorded)
- [ ] PR preview budgets enforced
- [ ] SLO dashboards deployed

### P2 Gate: Data Safety
- [ ] `migration-gate` passing with dry-run artifacts
- [ ] Data budgets met for 48h in staging
- [ ] pgBouncer configured
- [ ] RLS enabled on all tenant-scoped tables

### P3 Gate: Security/Compliance
- [ ] OPA policies compiled to Wasm
- [ ] Step-up auth + Reason-for-Access enforced
- [ ] Audit/RFA hash-chained events verified
- [ ] Identity dashboards green

### P4 Gate: Product GA
- [ ] Product SLOs green for 48h
- [ ] Search parity/reindex successful
- [ ] Ingest lag < 60s
- [ ] Realtime resume verified

### P5 Gate: DR/Chaos
- [ ] DR drill meets RTO ≤ 30m, RPO ≤ 5m
- [ ] Chaos evidence uploaded and signed
- [ ] Auto-rollback proven ≤ 5 min

### P6 Gate: Release
- [ ] RC tag signed
- [ ] Canary promoted 10 → 50 → 100%
- [ ] Evidence bundle attached to release
- [ ] GA flags flipped per plan

## Promotion Criteria

All must be true to promote from staging → production:
1. All required CI checks green
2. No SLO burn-rate alerts firing
3. Performance headroom ≥ 20%
4. Migration cutover criteria met
5. SBOM diffs within budget (no new CRITICAL/HIGH)
6. DR backup freshness verified

## Rollback Criteria

Automatic rollback triggered when:
1. Any SLO burn-rate alert fires for > 5 minutes
2. Golden path probe failure persists > 3 minutes
3. Error rate exceeds 1% for > 2 minutes
4. Critical security finding discovered

Rollback procedure:
1. Redeploy previous image digests via Helm
2. Kill high-risk feature flags
3. Verify golden paths re-green
4. Record audit event with evidence

## Evidence Pack (Required for GA Sign-off)

| Category | Contents |
|----------|----------|
| Supply Chain | SBOMs + SLSA attestation + cosign signatures (per image) |
| Observability | SLO/probe graphs, perf headroom charts |
| Chaos/DR | Drill outputs, timing evidence, gap analysis |
| Data | Migration plans, shadow parity reports, backfill status |
| Release | Release notes, commit range, approval matrix |
| Security | Audit/RFA excerpts, AuthZ decision stats, injection audit |
| Alerts | Alert hygiene snapshot, runbook coverage, top issues |

## GA Feature Flag Switch List

| Flag | Scope | Order |
|------|-------|-------|
| `search.ga.enabled` | All tenants | After P6 promote |
| `realtime.enabled` | Pilot tenants → All | Staged after P6 |
| `reports.renderer.v2.enabled` | All tenants | After P6 promote |
| `copilot.v2.enabled` | All tenants | After P6 promote |

## Current Status (2026-02-27)

### Completed
- [x] P0: 597 PRs merged, CI checks stabilized
- [x] P1: Observability instrumentation — OTel SDK (`libs/observability/`), Grafana cost dashboard, Prometheus alerting rules + recording rules
- [x] P1: CI/CD security gates — 4 GitHub Actions workflows (ci-security-gates, deploy-pipeline, release-pipeline, security-audit) with SAST/DAST, container scanning, SBOM generation
- [x] P1: Cost guardrails — metering library (`libs/cost/`), budget enforcement middleware, anomaly detection, Prometheus metrics, daily reports, config (`config/cost-model.yaml`)
- [x] P2: Migration gate — workflow with Postgres/Neo4j dry-run, schema snapshots, rollback testing, shadow parity (`migration-gate.yml`)
- [x] P3 (partial): OPA ABAC policies (6 packages, 80/80 tests)
- [x] P3 (partial): Injection audit (32 findings, 7 critical/high fixed)
- [x] P3 (partial): Threat model (STRIDE analysis)
- [x] P5: DR drill workflow — backup verification, failover/cutback drill, chaos validation, signed evidence bundle (`dr-drill.yml`)
- [x] P5 (partial): Chaos experiments defined (14 experiments in repo)
- [x] P6: Canary promotion pipeline — progressive delivery 10→50→100% with SLO gates, image signing, SBOM verification, evidence bundle (`ga-canary-promote.yml`)
- [x] P6 (partial): Provenance ledger library (11/11 tests pass)
- [x] P6 (partial): Release notes and changelog generated
- [x] P7: Alert-to-runbook mapping — 23 Sev1/Sev2 alerts mapped to owners + runbooks + escalation chains (`ops/runbooks/alert-runbook-mapping.yaml`)
- [x] P7: Alert hygiene CI gate — validates coverage, schema, and runbook path existence (`alert-hygiene.yml`)
- [x] P7 (partial): Testing strategy documented (6-layer, 23 security-critical tests)

### Remaining (require live infrastructure)
- [ ] P4: Product feature GA readiness — code is present (GraphQL gateway, Neo4j model, ingest, search, realtime), requires staging deployment + 48h SLO soak
- [ ] P8: GA flag flip + 24h KPI review (requires production deployment)

## Stop Conditions

Any of these trigger halt + escalation:
- Critical security finding
- SLO burn rate > 2x budget
- Data integrity issue
- Unresolved merge conflict in production path
