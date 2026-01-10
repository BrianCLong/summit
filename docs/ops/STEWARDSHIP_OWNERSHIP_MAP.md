# Stewardship Ownership Map

This document provides a centralized map of ownership for all critical controls, documents, and guardrails within the Summit ecosystem. Its purpose is to ensure clear accountability and sustainable operations.

| Area | Artifact(s) / Script(s) | Owner Role | Backup Role | Review Cadence | Escalation Trigger | Verification Command (if applicable) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GA Readiness** | `docs/SUMMIT_READINESS_ASSERTION.md` | Release Captain | Ecosystem Steward | Per Release | Revocation of "READY" status | `cat docs/SUMMIT_READINESS_ASSERTION.md` |
| **Evidence Map** | `docs/ga/EVIDENCE_MAP.yaml` (Not Present) | Release Captain | Ops Owner | Per Release | Evidence verification failure | `scripts/release/verify-evidence-map.mjs` (Not Present) |
| **Security Ledger** | `docs/security/SECURITY-ISSUE-LEDGER.md` | Security Owner | Release Captain | Weekly | Discovery of new P0/Critical vulnerability | `rg "CRITICAL" docs/security/SECURITY-ISSUE-LEDGER.md` |
| **Repo Hygiene Gate** | `AGENTS.md`, `.github/workflows/pr-quality-gate.yml` | Ecosystem Steward | Ops Owner | Monthly | Repeated CI failures on `main` | `pnpm lint && pnpm typecheck` |
| **Logging Safety** | `AGENTS.md` (Security Basics section) | Security Owner | Ops Owner | Monthly | PII detected in logs | `grep -r "PII" /var/log/` (Illustrative) |
| **Trust Dashboard** | Not Present | Ecosystem Steward | Docs Steward | Weekly | Deviation from baseline metrics | Not Applicable |
| **Release Bundle Verifier** | Not Present | Release Captain | Ops Owner | Per Release | Bundle integrity check failure | Not Applicable |
| **GA Drift Sentinel**| Not Present | Release Captain | Ecosystem Steward | Per Release | Change detected in frozen paths | Not Applicable |
| **Integrity Budgets**| Not Present | Ops Owner | Security Owner | Monthly | Budget exceedance | Not Applicable |
| **Extension Governance**| `AGENTS.md` (Partner Responsibility Boundaries) | Ecosystem Steward | Release Captain | Monthly | Unauthorized extension merged | `scripts/check-boundaries.cjs` |
| **Risk Register** | `docs/RISK_LEDGER.md` | Release Captain | Security Owner | Monthly | New Critical Risk identified | `cat docs/RISK_LEDGER.md` |
| **Incident Response**| Not Present | Security Owner | Ops Owner | Quarterly (Drill) | Security Incident Declared | Not Applicable |
| **Support Model** | Not Present | Support Owner | Docs Steward | Monthly | SLA Breach | Not Applicable |
| **Adoption Pack** | Not Present | Docs Steward | Ecosystem Steward | Per Release | Independent repro failure | Not Applicable |
| **Data Governance**| `AGENTS.md` (Regulatory & Ethics) | Data Governance Owner| Security Owner | Monthly | PII/Data residency violation | Not Applicable |
| **API Compatibility**| `openapi/` | Ecosystem Steward | Release Captain | Per Release | Breaking API change detected | `pnpm graphql:schema:check` |
| **Config/Feature-Flag Governance** | `docs/RISK_LEDGER.md` (Feature Flag section) | Release Captain | Security Owner | Monthly | Discovery of insecure flag implementation | `rg "eval|new Function" server/src/` (Illustrative) |
