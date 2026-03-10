# Summit GA Packet — Master Index

> **Version**: 1.0
> **Platform**: intelgraph-platform 4.1.15
> **Date**: 2026-03-10
> **Status**: CANDIDATE

This index maps every GA artifact to its authoritative source, the CI gate that produces or verifies it, and the signoff role that consumes it.

---

## Canonical Specification

| Document | Path | Role |
|----------|------|------|
| **GA Spec v1** (this release) | `docs/ga/SUMMIT_GA_SPEC_V1.md` | Single source of truth for GA |
| GA Definition (immutable) | `docs/ga/GA_DEFINITION.md` | Frozen acceptance criteria |
| GA Exit Criteria v1 | `docs/ga/GA_EXIT_CRITERIA_v1.md` | Binary release decision criteria |

---

## Architecture and Design

| Document | Path |
|----------|------|
| GA Architecture (Governance & Attestation) | `docs/ga/ARCHITECTURE.md` |
| Trust Boundaries | `docs/ga/TRUST-BOUNDARIES.md` |
| Governance Design | `docs/ga/GOVERNANCE-DESIGN.md` |
| Governance Invariants & Enforcement Map | `docs/ga/GOVERNANCE-INVARIANTS.md` |
| Provenance System | `docs/ga/PROVENANCE.md` |

---

## Security and Compliance

| Document | Path |
|----------|------|
| Security Baseline Contract | `docs/ga/SECURITY_BASELINE.md` |
| CI/CD Security Standards | `docs/ga/CI-CD-SECURITY-STANDARDS.md` |
| Failure Modes | `docs/ga/FAILURE_MODES.md` |
| Non-Capabilities (Known Limits) | `docs/ga/NON-CAPABILITIES.md` |
| AI Ethics Readiness | `docs/ga/ai-ethics-readiness.md` |
| Evidence Security | `docs/ga/EVIDENCE_SECURITY.md` |
| Risk Taxonomy | `docs/ga/RISK-TAXONOMY.md` |
| Risk Drift Tracker | `docs/ga/RISK-DRIFT.md` |

---

## Testing and Verification

| Document | Path |
|----------|------|
| Testing Strategy (Tier A/B/C) | `docs/ga/TESTING-STRATEGY.md` |
| Gate Policy | `docs/ga/GATE_POLICY.md` |
| Gate Policy YAML | `ops/gates/gates.yaml` |
| Gate Policy Schema | `schemas/gates/GatePolicy.v0.1.json` |
| Determinism and Reproducibility | `docs/ga/DETERMINISM_AND_REPRO.md` |
| Plan Stability Gate | `docs/ga/PLAN_STABILITY_GATE.md` |

---

## Evidence and Attestation

| Document / Artifact | Path |
|--------------------|------|
| Evidence Bundle Schema | `docs/ga/evidence-bundle-schema.md` |
| Evidence Bundles (policy) | `docs/ga/EVIDENCE_BUNDLES.md` |
| Evidence Signal Map | `docs/ga/EVIDENCE_SIGNAL_MAP_vNext.json` |
| MVP4 GA Evidence Map | `docs/ga/MVP4_GA_EVIDENCE_MAP.md` |
| MVP4 GA Gate Artifacts | `docs/ga/MVP4_GA_GATE_ARTIFACTS.md` |
| Claims vs Evidence | `docs/ga/claims-vs-evidence.md` |
| Verification Map | `docs/ga/verification-map.json` |
| Evidence Map YAML | `docs/ga/evidence_map.yml` |

---

## Operations

| Document | Path |
|----------|------|
| Operator Runbooks (Top 10) | `docs/ga/RUNBOOKS.md` |
| Operator Handbook | `docs/ga/OPERATOR_HANDBOOK.md` |
| Observability Guide | `docs/ga/OBSERVABILITY.md` |
| Deployment Guide | `docs/ga/DEPLOYMENT.md` |
| Rollback Procedures | `docs/ga/ROLLBACK.md` |
| Canary Deployment | `docs/ga/CANARY.md` |
| Day-0 Launch Runbook | `docs/ga/exec-go-no-go-and-day0-runbook.md` |
| Demo Runbook | `docs/ga/MVP4_GA_DEMO_RUNBOOK.md` |
| Golden Path | `docs/ga/golden-path.md` |

---

## Agents and Orchestration

| Document | Path |
|----------|------|
| Agent Overview | `docs/ga/AGENTS.md` |
| Agent Failure Modes | `docs/ga/AGENT-FAILURE-MODES.md` |
| Agent Run Lifecycle | `docs/ga/AGENT-RUN-LIFECYCLE.md` |
| SelfFlow Readiness | `docs/ga/selfflow-readiness.md` |

---

## Release Management

| Document | Path |
|----------|------|
| Release Manifest | `docs/ga/RELEASE_MANIFEST.md` |
| Release Readiness Report | `docs/ga/RELEASE-READINESS-REPORT.md` |
| Release Notes v2.0.0 | `docs/ga/RELEASE_NOTES_v2.0.0.md` |
| GA Declaration | `docs/ga/ga-declaration.md` |
| GA Gate | `docs/ga/ga-gate.md` |
| GA Checklist | `docs/ga/ga-checklist.md` |
| MVP4 GA Master Checklist | `docs/ga/MVP4-GA-MASTER-CHECKLIST.md` |
| Hardening Report | `docs/ga/ga-hardening-report.md` |
| Board One-Pager | `docs/ga/board-one-pager.md` |
| Commander's Go Packet | `docs/ga/commanders-go-packet.md` |

---

## Debt and Backlog

| Document | Path |
|----------|------|
| GA Delta Backlog | `docs/ga/GA_DELTA_BACKLOG.md` |
| Debt Registry | `docs/ga/DEBT-REGISTRY.md` |
| Debt Budgets | `docs/ga/DEBT-BUDGETS.md` |
| Legacy Mode | `docs/ga/LEGACY-MODE.md` |

---

## Evidence Generation Commands (Quick Reference)

```bash
# Full GA sweep
make ga-verify

# Node-only verification (Jest unavailable)
node --test testing/ga-verification/*.ga.test.mjs

# Schema-only validation
node scripts/ga/verify-ga-surface.mjs

# SBOM
./scripts/generate-sbom.sh

# Provenance verification
./scripts/verify_provenance.ts

# Transparency report
./scripts/generate-transparency-report.ts --tenant <uuid> --start <ISO8601>

# OPA policy tests
opa test policies/ -v

# Security scans
gitleaks detect --no-git
pnpm audit --audit-level critical

# Accessibility gate
pnpm run test:a11y-gate

# Integration tests (Testcontainers)
pnpm test:integration

# E2E (Playwright)
pnpm test:e2e

# Smoke (post-deploy)
make smoke
```

---

*Maintained by: Release Captain. Update this index whenever a new GA artifact is added or an existing document is retired.*
