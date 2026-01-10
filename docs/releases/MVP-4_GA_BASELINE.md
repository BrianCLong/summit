# MVP-4 GA Baseline

**Date Generated**: 2026-01-05
**Current Version**: 4.1.0-rc.1 (package.json)
**Target GA Version**: 4.1.0 GA
**Code Name**: Ironclad Standard (continued from 4.0.0)

---

## 1. MVP-4 Definition Summary

MVP-4 transforms Summit/IntelGraph from "feature-complete MVP" (v3) to a **"production-hardened Enterprise Platform"** (v4). Per `docs/releases/v4.0.0/MVP4-GA-DEFINITION.md`:

**The Golden Rule**: If it isn't automated, enforced, and provenanced, it doesn't exist in v4.

### Key Capabilities (v3 → v4 Delta)

| Area            | v3 State                 | v4 Target                              |
| --------------- | ------------------------ | -------------------------------------- |
| Server Behavior | Correct on valid input   | Deterministic failure on invalid input |
| Data Model      | Neo4j constraints exist  | Full semantic enforcement              |
| Governance      | OPA/ABAC enforcing       | Policy-as-Code coverage > 95%          |
| Evidence        | Signed bundles available | Full chain of custody                  |
| CI/CD           | Passing tests            | Hard gated - blocks on drift/CVEs      |
| Observability   | Traces & Metrics         | SLO-driven alerts                      |

---

## 2. MVP-4 Checklist (Derived from Repo)

### Source Documents

- `docs/release/GA_CHECKLIST.md` - Operator runbook
- `docs/release/GA_READINESS_REPORT.md` - Current status
- `docs/release/GA_EVIDENCE_INDEX.md` - Evidence tracking
- `docs/release/GA_DECISIONS.md` - Deferred items
- `docs/releases/v4.0.0/MVP4-GA-READINESS.md` - Gate checklist

### Must-Have Gates

| Gate                      | Status     | Evidence                     | Notes                                   |
| ------------------------- | ---------- | ---------------------------- | --------------------------------------- |
| **CI/CD - Builds**        | ✅         | Reproducible builds in CI    | SLSA L3 target                          |
| **CI/CD - Tests**         | ⚠️         | Tests run but non-blocking   | TypeScript errors - see GA_DECISIONS.md |
| **CI/CD - Security**      | Pending    | Run `npm run security:check` | Target: 0 High/Critical CVEs            |
| **CI/CD - Lint**          | Pending    | Run `npm run lint:strict`    | Target: 0 ESLint errors                 |
| **Reliability - Smoke**   | Pending    | Run `make smoke`             | Required for GA                         |
| **Reliability - Perf**    | ⚠️ Blocked | k6 unavailable               | P95 < 200ms target                      |
| **Governance - Policy**   | ✅         | 100% mutation coverage       | PolicyWatcher active                    |
| **Governance - Evidence** | ✅         | Provenance & signatures      | SBOM generation pending                 |
| **Docs - API**            | ✅         | Up-to-date                   |                                         |
| **Docs - Runbooks**       | ✅         | P0 alerts covered            |                                         |

---

## 3. Golden Path Commands

From `Makefile`, `package.json`, and `docs/release/GA_CHECKLIST.md`:

### Fresh Clone Verification

```bash
# 1. Prerequisites check
make dev-prereqs

# 2. Bootstrap toolchain
make bootstrap

# 3. Static analysis
pnpm lint                       # or: npm run lint:strict

# 4. Type safety
pnpm typecheck                  # or: npm run typecheck

# 5. Unit tests (currently non-blocking)
pnpm test:unit                  # or: npm run test:unit

# 6. Integration tests (currently non-blocking)
pnpm test:integration           # or: npm run test:integration

# 7. Full CI parity
make ci

# 8. Smoke test (golden path)
make smoke
```

### Runtime Verification

```bash
# Start dev stack
make dev-up

# Health probes
curl -f http://localhost:8080/healthz
curl -f http://localhost:3000

# Smoke flows
make dev-smoke

# Stop stack
make dev-down
```

### Security & Compliance

```bash
# Security scan
npm run security:check

# SBOM generation
npm run generate:sbom

# Governance checks
npm run verify:governance
npm run verify:living-documents
```

### Build & Release

```bash
# Build artifacts
npm run build

# Docker + wheel artifacts
make release

# Provenance (if enabled)
npm run generate:provenance
```

---

## 4. Current Blockers (Ranked by Risk/Effort)

### P0 - Must Fix for GA

| Blocker                          | Risk   | Effort | Owner           | Ticket               |
| -------------------------------- | ------ | ------ | --------------- | -------------------- |
| TypeScript test errors           | HIGH   | MEDIUM | Engineering     | GA_DECISIONS.md #1   |
| Full `make ci` run not completed | HIGH   | LOW    | Release Captain | GA_EVIDENCE_INDEX.md |
| Security scan not executed       | HIGH   | LOW    | Security        | GA_EVIDENCE_INDEX.md |
| SBOM generation pending          | MEDIUM | LOW    | Security        | GA_EVIDENCE_INDEX.md |

### P1 - Should Fix for GA

| Blocker                             | Risk   | Effort | Owner           | Notes                             |
| ----------------------------------- | ------ | ------ | --------------- | --------------------------------- |
| Load tests blocked (k6 unavailable) | MEDIUM | MEDIUM | SRE             | Environment issue                 |
| Sign-offs not captured              | LOW    | LOW    | Release Captain | Requires Product/Eng/Security/SRE |

### Deferred (Post-GA)

| Item                              | Reason                 | Target         |
| --------------------------------- | ---------------------- | -------------- |
| PR #15595 (tenant usage exports)  | XL size, 94K deletions | Post-GA sprint |
| PR #15580 (runtime brand packs)   | XL size, 94K deletions | Post-GA sprint |
| PR #15576 (support impersonation) | XL size, 94K deletions | Post-GA sprint |

---

## 5. Test Status

Per `ci.yml` workflow:

| Job                | Status       | Notes                                                       |
| ------------------ | ------------ | ----------------------------------------------------------- |
| lint               | Required     | Must pass                                                   |
| verify             | Required     | Must pass                                                   |
| test (unit)        | Non-blocking | `continue-on-error: true` until 2026-01-15                  |
| test (integration) | Non-blocking | `continue-on-error: true` until 2026-01-15                  |
| golden-path        | Required     | Runs `make bootstrap && make up && make smoke && make down` |
| reproducible-build | Required     | Verifies deterministic build output                         |
| governance         | Non-blocking | `continue-on-error: true`                                   |
| provenance         | Non-blocking | `continue-on-error: true`                                   |
| schema-diff        | Non-blocking | GraphQL schema check                                        |
| security           | Required     | After golden-path                                           |
| ga-risk-gate       | Required     | Runs early, fails fast                                      |
| build-server-image | Required     | Docker image build                                          |

---

## 6. Release Mechanics

- **Package Manager**: pnpm 10.0.0
- **Workspaces**: `packages/*`, `client`, `server`
- **CI**: GitHub Actions (`.github/workflows/ci.yml`)
- **Release**: semantic-release (`package.json` config)
- **Versioning**: SemVer

### Key Files

- `package.json` - Root version: 4.1.0-rc.1
- `CHANGELOG.md` - Release history
- `.releaserc.json` - Release configuration

---

## 7. Definition of Done (MVP-4 GA Gate)

A release is "MVP-4 GA" only if ALL are true:

1. **CI Green**: All required checks pass on release commit
2. **Fresh Clone Works**: `make bootstrap && make ci && make smoke` succeeds
3. **Scope Complete**: All MVP-4 items delivered or explicitly deferred with issues
4. **Release Artifacts Exist**: Version bumped, release notes written, runbook exists
5. **Security Minimums**: Secret scan clean, SBOM generated, no High/Critical CVEs
6. **Evidence Pack**: Commands and outputs documented

---

## Next Steps

1. Execute `make ci` and capture full output
2. Run `npm run security:check` and store results
3. Generate SBOM with `npm run generate:sbom`
4. Fix TypeScript test errors (or document expiry acceptance)
5. Capture sign-offs from Product/Engineering/Security/SRE
6. Update GA_EVIDENCE_INDEX.md with all evidence
7. Tag release and create GitHub Release

---

_Generated by MVP-4 GA Commander_
