# Governed Multi-Agent OS (Governed OS) Overview

## Purpose
The Governed OS is the control-plane substrate for Summit: a governed multi-agent OS with
policy graph + provenance graph + per-agent RBAC + approvals + audit trails as first-class
control objects. The objective is operational moat: compliance-grade auditability, evidence
integrity, and deterministic replay that are continuously enforced and observable. This
positions Summit as a deployment-grade, governance-native platform rather than a feature-only
analysis suite.

The Governed OS aligns to the Summit Readiness Assertion and makes it continuously verifiable
through policy- and evidence-backed gates and artifacts. See
`docs/SUMMIT_READINESS_ASSERTION.md` for the authoritative readiness scope.

## Core Guarantees (Product Surface)

1. **Governed execution**: every agent step runs under an execution identity with scoped
   capabilities. Deny-by-default is enforced at compile time and runtime.
2. **Evidence-first outputs**: all outputs are bound to evidence artifacts that resolve to
   deterministic hashes and are replayable offline.
3. **Auditor verify**: auditor-facing verification of any report completes within an SLO-bound
   window and produces a deterministic evidence bundle.
4. **Tenant- and residency-aware isolation**: policy and provenance graphs are partitioned per
   tenant+region; citation resolution does not cross residency boundaries.

## Architecture at a Glance

- **Policy Graph**: graph-native rules and scopes; compiled into enforceable policy-as-code.
- **Provenance Graph**: graph-native evidence lineage, hashing, and citation resolution.
- **Maestro Enforcement**: execution identity, scoped capabilities, approval gates, and export
  gates with policy explainability artifacts.
- **CompanyOS Memory**: approvals, exception justifications, policy diffs, and audit sessions
  retained with immutable evidence artifacts.

## Operational Moat

The moat is operational, not aesthetic:
- **Governance is verifiable** (SLOs, dashboards, deterministic evidence bundles).
- **Audit friction is reduced** (auditor verify UX, policy explainability trees).
- **Switching cost is compliance cost** (removing Summit means losing evidence guarantees).

## Key Interfaces

- **Graph APIs**
  - Policy Graph API
  - Provenance Graph API
- **UI Routes**
  - Approvals Inbox
  - Auditor Verify
  - Compliance Posture Dashboard
- **Runtime**
  - Maestro enforcement hooks
  - Export gates with signed approvals

## Evidence Bundle Contract

All Governed OS workflows emit the following deterministic artifacts under
`evidence/EVID-GOVOS-YYYYMMDD-<slug>-<gitsha7>/`:

- `report.json`
- `metrics.json`
- `stamp.json`

Evidence bundles are replayable offline and produce hash-identical `metrics.json` output when
rerun with the same policy, model, dataset, and code fingerprints.

## Roadmap Alignment

The Governed OS epic is tracked as a PR stack (Policy Graph, Provenance Graph, RBAC + approvals,
Auditor Verify, Compliance Dashboard) with explicit CI gates, evals, and regression tests. The
integration cadence is intentionally constrained to prevent policy or evidence regressions.
