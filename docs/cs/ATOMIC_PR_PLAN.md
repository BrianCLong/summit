# Atomic PR Plan

This document outlines the atomic pull request plan for the Customer Success workstreams.

### PR 1: WORKSTREAM 1 - Customer Onboarding Automation Primitives
- **Title:** feat(cs): Implement onboarding automation primitives
- **Paths:**
  - `docs/cs/ONBOARDING_PLAYBOOK.md`
  - `scripts/cs/generate_onboarding_checklist.ts`
- **DoD:** A standardized onboarding checklist can be generated per customer without manual editing.
- **Evidence Artifacts:**
  - `artifacts/cs/<tenant>/<tag>/onboarding-checklist.md`
  - `artifacts/cs/<tenant>/<tag>/manifest.json`

### PR 2: WORKSTREAM 2 - Customer Health Model
- **Title:** feat(cs): Implement customer health model
- **Paths:**
  - `docs/cs/HEALTH_MODEL.md`
  - `docs/cs/health_model.yml`
  - `schemas/cs/health_model.schema.json`
  - `scripts/cs/compute_health_score.ts`
- **DoD:** Given the same inputs, the score is stable and explainable with factor breakdown.
- **Evidence Artifacts:**
  - `artifacts/cs/<tenant>/<date>/health.json`
  - `artifacts/cs/<tenant>/<date>/stamp.json`

### PR 3: WORKSTREAM 3 - Renewal Risk Signals
- **Title:** feat(cs): Implement renewal risk signals
- **Paths:**
  - `docs/cs/RENEWAL_RISK.md`
  - `scripts/cs/compute_renewal_risk.ts`
- **DoD:** Risk report is attributable to explicit rules, not vague heuristics.
- **Evidence Artifacts:**
  - `artifacts/cs/<tenant>/<date>/renewal-risk.json`
  - `artifacts/cs/<tenant>/<date>/stamp.json`

### PR 4: WORKSTREAM 4 - Customer Trust Dashboard (Internal)
- **Title:** feat(cs): Implement customer trust dashboard
- **Paths:**
  - `docs/cs/TRUST_DASHBOARD_SPEC.md`
  - `scripts/cs/generate_trust_dashboard.ts`
- **DoD:** Dashboard can be generated for a tenant from standard artifacts without manual assembly.
- **Evidence Artifacts:**
  - `artifacts/cs/<tenant>/<date>/trust-dashboard.md`
  - `artifacts/cs/<tenant>/<date>/trust-dashboard.json`

### PR 5: WORKSTREAM 5 - CS Evidence Bundle
- **Title:** feat(cs): Implement CS evidence bundle export
- **Paths:**
  - `scripts/cs/export_cs_evidence_bundle.ts`
- **DoD:** A repeatable packet can be exported and verified.
- **Evidence Artifacts:**
  - `artifacts/cs-bundles/<tenant>/<qbr-date>/{manifest,checksums,stamp}`
