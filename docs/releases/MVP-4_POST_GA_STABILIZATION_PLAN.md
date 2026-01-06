# MVP-4 Post-GA Stabilization Plan (Day 0–14)

**Authority Anchor:** `docs/SUMMIT_READINESS_ASSERTION.md`
**Scope:** Stabilization-only; no feature releases permitted during this window. (Policy: `docs/release/PATCH_PROCESS.md`)
**Source of Commitments:** `docs/ga/GA_DEFINITION.md` (Part 12), `docs/release/GA_READINESS_REPORT.md`, `docs/releases/v4.0.0/MVP4-GA-READINESS.md`

## 1) Operating Constraints (Non-Negotiable)

- **Change class**: Critical Hotfix or Standard Patch only; Feature Releases are **not permitted**. (Policy: `docs/release/PATCH_PROCESS.md`)
- **Branching**: All fixes originate from the GA tag, then backported. (Policy: `docs/release/PATCH_PROCESS.md`)
- **Evidence**: Every action must land in `docs/release/GA_EVIDENCE_INDEX.md` with logs/artifacts. (Requirement: `docs/release/GA_EVIDENCE_INDEX.md`)
- **Governed Exceptions**: Any deferred requirement is recorded with remediation + expiry. (Waivers: `docs/ga/GA_DEFINITION.md` Part 11)

## 2) Stabilization Goals (Day 0–14)

- **Critical Week 1 commitments executed** per GA definition. (Source: `docs/ga/GA_DEFINITION.md` Part 12.1)
- **Full CI and security baselines captured** in evidence index. (Source: `docs/release/GA_READINESS_REPORT.md`)
- **Hypercare monitoring enforced for first 72 hours.** (Source: `docs/releases/v4.0.0/MVP4-GA-READINESS.md`)

## 3) Timeline and Work Plan

### Day 0–3 (Hypercare)

- **Monitoring cadence**: hourly SLO checks, reduced alert thresholds. (Source: `docs/releases/v4.0.0/MVP4-GA-READINESS.md`)
- **CI parity verification**: run and capture logs for `make ci` and `make smoke`. (Source: `docs/release/GA_READINESS_REPORT.md`)
- **Security baselines**: run `npm run security:check`, `npm run generate:sbom`, `npm run generate:provenance`, and attach outputs. (Source: `docs/release/GA_CHECKLIST.md`)
- **Governance verification**: run `npm run verify:governance` and `npm run verify:living-documents`. (Source: `docs/release/GA_CHECKLIST.md`)

### Day 4–7 (Week 1 Commitments)

- **Enable `pnpm audit` in CI** at critical level and capture evidence. (Commitment: `docs/ga/GA_DEFINITION.md` 12.1)
- **Implement error budgets in Prometheus** and document the config location. (Commitment: `docs/ga/GA_DEFINITION.md` 12.1)
- **Create ADR-009** for MVP-4 GA decisions. (Commitment: `docs/ga/GA_DEFINITION.md` 12.1)
- **Zero P0 incidents**: record incident log (or “none observed”) in evidence index. (Commitment: `docs/ga/GA_DEFINITION.md` 12.1)

### Day 8–14 (Week 2 Stabilization)

- **Test reliability**: eradicate quarantined tests and produce 100% pass rate evidence. (Commitment: `docs/ga/GA_DEFINITION.md` 12.2)
- **API determinism audit**: capture findings and required fixes. (Commitment: `docs/ga/GA_DEFINITION.md` 12.2)
- **Type safety audit**: identify and remove `any` in core paths; log findings as Governed Exceptions if deferrals remain. (Commitment: `docs/ga/GA_DEFINITION.md` 12.2)

## 4) Verification Gates (Each Patch)

- **Patch classification** documented and approved. (Policy: `docs/release/PATCH_PROCESS.md`)
- **Reproduction and fix** documented with a minimal test when code is touched. (Policy: `docs/release/PATCH_PROCESS.md`)
- **CI green**: `make ci` and `make smoke` logs captured. (Source: `docs/release/GA_READINESS_REPORT.md`)
- **Drift check** executed if required by patch scope. (Policy: `docs/release/PATCH_PROCESS.md`)

## 5) Evidence Capture Checklist (Day 0–14)

| Item          | Command/Artifact                       | Evidence Location                   |
| ------------- | -------------------------------------- | ----------------------------------- |
| CI parity     | `make ci`                              | `docs/release/GA_EVIDENCE_INDEX.md` |
| Smoke         | `make smoke`                           | `docs/release/GA_EVIDENCE_INDEX.md` |
| Security scan | `npm run security:check`               | `docs/release/GA_EVIDENCE_INDEX.md` |
| SBOM          | `npm run generate:sbom` -> `sbom.json` | `docs/release/GA_EVIDENCE_INDEX.md` |
| Provenance    | `npm run generate:provenance`          | `docs/release/GA_EVIDENCE_INDEX.md` |
| Governance    | `npm run verify:governance`            | `docs/release/GA_EVIDENCE_INDEX.md` |
| Living docs   | `npm run verify:living-documents`      | `docs/release/GA_EVIDENCE_INDEX.md` |
| Hypercare log | Monitoring snapshots                   | `docs/release/GA_EVIDENCE_INDEX.md` |

## 6) Risk Ledger (Stabilization Window)

- **API determinism failures**: enforce typed errors and remove unhandled 500s. (Source: `docs/releases/v4.0.0/MVP4-GA-Readiness-Package.md` risk R-01)
- **Policy bypass risk**: ensure authz coverage per mutation and evidence via governance checks. (Source: `docs/releases/v4.0.0/MVP4-GA-Readiness-Package.md` risk R-02)
- **Secrets hygiene gaps**: confirm scans and rotation readiness. (Source: `docs/releases/v4.0.0/MVP4-GA-Readiness-Package.md` risk R-04)

## 7) Governed Exceptions (If Needed)

- Record any deferred requirements using the waiver template and include expiry. (Process: `docs/ga/GA_DEFINITION.md` Part 11)
- List each exception in `docs/release/GA_EVIDENCE_INDEX.md` with remediation target.

## 8) Exit Criteria (Day 14)

- **All Week 1 commitments complete** with evidence.
- **Week 2 audits complete** with remediation or Governed Exceptions documented.
- **CI green with deterministic smoke evidence** captured for the stabilization release.

**Status:** Intentionally constrained to stabilization scope only. Finalized.
