# GA Security Gate Summary (Commit-Indexed Evidence)

This document consolidates Security Lane GA-readiness evidence and provides reviewer-friendly verification steps.
All entries are traceable to Git history by commit.

---

## 1) Commit Index (Security Lane Evidence)

| Commit       | Description                                     | Key Artifacts                                                            |
|--------------|-------------------------------------------------|--------------------------------------------------------------------------|
| `f454ae1650` | OPA exclusion rationale + CVE review date       | `SECURITY/opa-policy-coverage.md`, `SECURITY/cve-exceptions.md`          |
| `0e88c85412` | npm vuln remediation + OPA job wrapper adoption | `package.json` (overrides), 6 processor files, drift workflows          |
| `58d53e2528` | Shai-Hulud supply chain hardening               | `policy/npm-lifecycle-allowlist.json`, `tools/verify-subsumption-bundle.py` |
| `14b90ede42` | CVE resolution + OPA tenant-api integration     | `SECURITY/cve-exceptions.md`, `companyos/services/tenant-api/`           |
| `c02dae6fe0` | tar/hono/multer vulnerability overrides         | `package.json` (overrides section)                                       |

---

## 2) Controls Added (What changed, where, how to verify)

| Control                        | Location                                        | Verification                                                              |
|--------------------------------|-------------------------------------------------|---------------------------------------------------------------------------|
| @apollo/server >=5.4.0         | `package.json:313`                              | `pnpm audit` shows no apollo/server vulns                                 |
| OPA job wrapper (6 processors) | `server/src/jobs/processors/*.ts`               | `grep -R "withOpaPolicy" server/src/jobs/processors` confirms coverage    |
| Subsumption drift monitor      | `.github/workflows/subsumption-drift.yml`       | Scheduled daily 03:00 UTC; opens issues on failure                        |
| Required-checks discovery      | `.github/workflows/required-checks-discovery.yml` | Scheduled weekly Monday 04:00 UTC                                       |
| npm lifecycle deny-by-default  | `.npmrc` + `policy/npm-lifecycle-allowlist.json` | `scripts/ci/verify-npm-lifecycle.sh`                                     |
| CVE exceptions documented      | `SECURITY/cve-exceptions.md`                    | 5 CVEs with compensating controls, Q2 2026 review                         |

---

## 3) OPA Coverage Summary (Operational posture)

| Status | Processors | Rationale |
|--------|------------|-----------|
| Wrapped | analytics, ingestion, intent, notification, report, webhook | User-facing jobs requiring policy enforcement |
| Excluded | resource-janitor | System housekeeping, no user context |
| Excluded | soc2EvidenceJob | System-scheduled compliance, pg-boss, no external input |
| Excluded | retentionProcessor | System-scheduled, internal datasets only |
| Deprecated | ingestion.processor.ts | Superseded by `ingestionProcessor.ts` |

**Full details:** `SECURITY/opa-policy-coverage.md`

---

## 4) CVE Exception Summary

| CVE/GHSA | Package | Status | Compensating Control |
|----------|---------|--------|----------------------|
| GHSA-mp6q-xf9x-fwf7 | @apollo/server | Resolved | Override to >=5.4.0 |
| GHSA-mp6q-xf9x-fwf7 | apollo-server-express | Accepted | `startStandaloneServer` not used |
| GHSA-pfq8-rq6v-vf5m | html-minifier | Accepted | Dev dependency only |
| GHSA-3966-f6p6-2qr9 | npm | Accepted | CI environment only |
| GHSA-22r3-9w55-cj54 | pkg | Accepted | Not used at runtime |
| GHSA-45h5-66jx-r2wf | mjml | Accepted | Template input controlled |

**Full details:** `SECURITY/cve-exceptions.md`
**Next review:** Q2 2026

---

## 5) Remaining P0/P1 Items (GA blockers)

| Priority | Item                          | Owner      | Blocker                    | Runbook |
|----------|-------------------------------|------------|----------------------------|---------|
| P0       | n8n credential rotation       | DevOps     | Requires runbook execution | `runbooks/n8n-credential-rotation.md` |
| P1       | Branch protection enforcement | Governance | Admin token pending        | N/A (detective control active) |

---

## 6) Reviewer Quick Checks (copy/paste)

### Vulnerabilities / overrides
```bash
pnpm audit --json 2>/dev/null | jq '.advisories | length'
grep -A 50 '"overrides"' package.json | head -60
```

### OPA wrapper coverage
```bash
grep -l "withOpaPolicy" server/src/jobs/processors/*.ts
```

### npm lifecycle policy
```bash
bash scripts/ci/verify-npm-lifecycle.sh --verbose
```

### Drift monitor status
```bash
gh run list --workflow=subsumption-drift.yml --limit=5
```

### Evidence traceability
```bash
git show f454ae1650 --name-only --oneline
git show 0e88c85412 --name-only --oneline
git show 58d53e2528 --name-only --oneline
git show 14b90ede42 --name-only --oneline
git show c02dae6fe0 --name-only --oneline
```

---

## 7) CI Integration

### PR Comment Badge (for CI scripts)
```markdown
[![Security Gate](https://img.shields.io/badge/Security%20Gate-Passed-brightgreen)](SECURITY/ga-security-gate-summary.md)
```

### Deep Links for Release Notes
- Security Gate Summary: `SECURITY/ga-security-gate-summary.md`
- CVE Exceptions: `SECURITY/cve-exceptions.md`
- OPA Coverage: `SECURITY/opa-policy-coverage.md`

---

## 8) Notes / Determinism

This file is intended to be stable and deterministic:
- Do not add timestamps or "current date" language.
- Prefer commit IDs and file paths for provenance.
- Update only when controls change, not on schedule.
- CI may generate separate artifacts with dynamic status; this doc remains static.

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `SECURITY/cve-exceptions.md` | Full CVE analysis and risk acceptance |
| `SECURITY/opa-policy-coverage.md` | OPA enforcement coverage matrix |
| `SECURITY/threat-model.md` | Threat model and attack surface |
| `backlog/DEFERRED_SUMMARY.md` | Prioritized deferred items |
