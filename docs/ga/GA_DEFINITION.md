# GA DEFINITION (IMMUTABLE CONTROL DOCUMENT)

> **Status**: FROZEN
> **Version**: 1.0.0
> **Authority**: Release Captain
> **Created**: 2026-01-01
> **Last Modified**: 2026-01-01

---

## Executive Statement

This document is the **single source of truth** for General Availability (GA) of Summit.

**GA means**:
- Summit is **credible**: Claims are backed by evidence
- Summit is **defensible**: Security posture is provable
- Summit is **auditable**: Every decision has a trail
- Summit is **governed**: Autonomy has explicit boundaries
- Summit is **deterministic**: Builds and tests are reproducible

**Operating Principle**:
> If it is not defined here, it is not required for GA.
> If it is defined here, it is non-negotiable.

---

## PART 1: REQUIRED FEATURES

### 1.1 Core Platform Capabilities

| Feature | Specification | Evidence Location |
|---------|--------------|-------------------|
| **Authentication** | OIDC/JWT with token validation, refresh, and revocation | `services/authz-gateway/`, tests in `packages/*/test/auth*.test.ts` |
| **Authorization** | RBAC + ABAC with tenant isolation and role hierarchy | `policies/abac_tenant_isolation.rego`, `policies/mvp4_governance.rego` |
| **Rate Limiting** | Per-tenant, per-endpoint with circuit breaker | Gateway config, `policies/rate_limit.rego` |
| **Provenance Tracking** | Immutable audit ledger (append-only) with cryptographic signing | `packages/prov-ledger/`, `server/scripts/verify_provenance.ts` |
| **Approval Workflows** | Policy-enforced human-in-loop for high-risk operations | `policies/approvals.rego`, `server/routes/approvals/` |
| **Policy Engine** | OPA-based with default-deny, 100% mutation coverage | `policies/mvp4_governance.rego`, `policies/tests/` |

**Acceptance Criteria**:
- All features pass `pnpm verify` (see Section 3)
- All features have policy coverage (enforced by CI)
- All features are documented in runbooks (see Section 5)

### 1.2 Security Baseline

| Control | Implementation | Verification Command |
|---------|----------------|---------------------|
| **Default Deny** | All mutations require explicit policy allow | `opa test policies/ -v` |
| **Secrets Management** | No secrets in code, all via env/vault | `gitleaks detect --no-git` |
| **Dependency Security** | No critical CVEs in production deps | `pnpm audit --audit-level critical` |
| **Input Validation** | All GraphQL inputs validated, sanitized | Schema validation tests |
| **HTTPS Enforced** | TLS 1.2+ only, HSTS headers | `make smoke` (checks SSL) |
| **Break-Glass Access** | Emergency procedures with audit trail | `docs/ga/RUNBOOKS.md` Section 4 |

**Acceptance Criteria**:
- Gitleaks scan clean (CI enforced)
- Zero critical CVEs (or documented exceptions)
- All endpoints require authentication (verified by `make smoke`)

### 1.3 Observability & Operations

| Capability | Requirement | Evidence |
|------------|-------------|----------|
| **Metrics** | Prometheus-compatible, 4 golden signals | `slo/*.yaml`, Grafana dashboards |
| **Logging** | Structured JSON, centralized, searchable | Loki config, log schema |
| **Tracing** | Distributed traces with correlation IDs | Tempo integration |
| **Alerting** | P0/P1/P2 alerts with runbook links | Alert rules, PagerDuty integration |
| **Health Checks** | Liveness, readiness, startup probes | `server/routes/health.ts` |
| **SLOs** | Availability ≥99.9%, P95 latency <200ms, Error rate <0.1% | `docs/ga/OBSERVABILITY.md` |

**Acceptance Criteria**:
- All SLO files exist and validate: `./scripts/validate-slos.sh`
- Dashboards render: Grafana import test
- Alerts fire: Chaos test suite

---

## PART 2: REQUIRED EVIDENCE

### 2.1 Evidence Categories

All controls require **automatable evidence**. Manual evidence is invalid.

| Category | Artifact Type | Location | Automation |
|----------|--------------|----------|------------|
| **Build** | Checksums, SBOM, SLSA provenance | `artifacts/`, workflow logs | CI generates |
| **Security** | Scan reports, CVE exceptions | `.github/workflows/ci-security.yml` | Gitleaks, Snyk |
| **Policy** | Test results, coverage reports | `policies/tests/`, OPA output | `opa test -v` |
| **Performance** | Load test results, SLO compliance | `test/perf/`, Prometheus queries | k6, Grafana |
| **Compliance** | Audit trail exports, signed records | `evidence/`, `scripts/generate-transparency-report.ts` | Automated export |

### 2.2 Evidence Commands (Required to Pass)

```bash
# Build Evidence
pnpm install --frozen-lockfile
pnpm build
pnpm verify  # Runs all verify_*.ts scripts

# Security Evidence
gitleaks detect --no-git
pnpm audit --audit-level critical
opa check policies/
opa test policies/ -v

# Policy Evidence
make smoke  # Golden path integration test
pnpm test:integration  # Full test suite

# Provenance Evidence
./scripts/generate-sbom.sh
./scripts/verify-provenance.ts
cosign verify --key cosign.pub <artifact>

# Compliance Evidence
./scripts/generate-transparency-report.ts \
  --tenant <uuid> \
  --start <ISO8601> \
  --end <ISO8601> \
  --format json
```

### 2.3 Evidence Retention

| Evidence Type | Retention Period | Storage |
|---------------|-----------------|---------|
| Audit logs | 7 years | PostgreSQL + archive |
| Build artifacts | 2 years | Artifact registry |
| Security scans | 1 year | CI artifacts |
| Compliance reports | 7 years | Encrypted S3 bucket |

---

## PART 3: REQUIRED COMMANDS (MUST SUCCEED)

### 3.1 Developer Commands

```bash
# Bootstrap (fresh clone)
git clone <repo>
pnpm install --frozen-lockfile
make bootstrap  # Sets up DB, Redis, etc.
make up         # Starts services
make smoke      # Verifies golden path
make down       # Clean shutdown

# Build
pnpm build      # Must be deterministic
pnpm typecheck  # Zero errors
pnpm lint       # Zero warnings (--max-warnings 0)

# Test
pnpm test              # All unit tests
pnpm test:integration  # Integration tests
pnpm verify            # Critical path verification scripts
```

### 3.2 CI Commands (Must Pass for Merge)

```bash
# CI Core (ci.yml)
pnpm install --frozen-lockfile
pnpm lint
pnpm verify
pnpm test:unit
pnpm test:integration
make smoke
pnpm build  # Twice, assert determinism

# CI Security (ci-security.yml)
gitleaks detect --no-git
pnpm audit --audit-level critical
snyk test  # If token available

# CI Governance (mvp4-gate.yml)
pnpm lint:strict
pnpm typecheck
opa check policies/
opa test policies/ -v
make smoke
```

**Enforcement**:
- All commands in this section are **CI-enforced**.
- PRs cannot merge if any command fails (except where explicitly marked `continue-on-error: true` with waiver).

### 3.3 Release Commands

```bash
# Pre-release verification
./scripts/pre-release-checklist.sh  # Gates on all evidence

# Release build
pnpm build
export SOURCE_DATE_EPOCH=$(git log -1 --pretty=format:%ct)
docker build --build-arg SOURCE_DATE_EPOCH -t summit:${VERSION} .

# Provenance
cosign sign-blob --key cosign.key <artifact>
./scripts/generate-sbom.sh > sbom.json
./scripts/attest-slsa.sh

# Deployment
kubectl apply -f k8s/canary/
./scripts/canary-verify.sh  # Must pass before full rollout
kubectl apply -f k8s/production/
```

---

## PART 4: REQUIRED ARTIFACTS

### 4.1 Per-Release Artifacts

| Artifact | Format | Signing | Retention |
|----------|--------|---------|-----------|
| **SBOM** | CycloneDX JSON | Cosign | 2 years |
| **SLSA Provenance** | in-toto JSON | Sigstore | 2 years |
| **Release Notes** | Markdown | Git-signed tag | Permanent |
| **Security Audit** | PDF + JSON | PGP signature | 7 years |
| **Evidence Bundle** | Tarball | SHA256 + sig | 7 years |
| **Binary Checksums** | SHA256SUMS | Cosign | 2 years |

**Distribution**:
- All artifacts published to artifact registry
- All signatures verifiable via public key in repo (`cosign.pub`)
- All evidence bundles archived to compliance storage

### 4.2 Per-Commit Artifacts (CI)

| Artifact | Generated By | Consumed By |
|----------|-------------|-------------|
| `build-checksums-a.txt` | Reproducible build step | CI verification |
| `build-checksums-b.txt` | Reproducible build step | CI verification |
| `verification-results/` | `pnpm verify` | Audit trail |
| `opa-test-results.json` | `opa test` | Policy compliance |
| `gitleaks-report.json` | Gitleaks | Security audit |

---

## PART 5: REQUIRED DOCUMENTATION

### 5.1 GA Documentation Bundle

| Document | Purpose | Audience | Status |
|----------|---------|----------|--------|
| `DEPLOYMENT.md` | How to deploy Summit | SRE | ✅ Exists |
| `ROLLBACK.md` | Emergency rollback procedures | SRE | ✅ Exists |
| `OBSERVABILITY.md` | Monitoring, alerts, dashboards | SRE | ✅ Exists |
| `CANARY.md` | Canary deployment process | SRE | ✅ Exists |
| `RUNBOOKS.md` | Incident response playbooks | On-call | ✅ Exists |
| `SECURITY_BASELINE.md` | Security controls catalog | Security team | ✅ Exists |
| `OPERATOR_HANDBOOK.md` | Day-2 operations guide | SRE | ✅ Exists |
| `AUTONOMY_MODEL.md` | Autonomy tiers and governance | Compliance | ⚠️ **REQUIRED** |
| `GA_DEFINITION.md` | This document | All | ✅ This file |

**Documentation Standards**:
- All runbooks must be **executable** (scripts or notebooks)
- All architecture docs must have **decision records** (ADRs)
- All APIs must have **OpenAPI specs** (machine-readable)

### 5.2 Governance Surface (Locked)

| File | Lock Status | Rationale |
|------|-------------|-----------|
| `AGENTS.md` | 🔒 Locked | Defines agent authority and constraints |
| `CONTRIBUTING.md` | 🔒 Locked | Developer covenant |
| `docs/governance/CONSTITUTION.md` | 🔒 Locked | Ecosystem law |
| `docs/governance/META_GOVERNANCE.md` | 🔒 Locked | Governance framework |
| `docs/ga/GA_DEFINITION.md` | 🔒 Locked | This file (immutable) |

**Lock Enforcement**:
- Changes to locked files require **2+ approvals from security-council**
- CI fails if locked files modified without governance label

---

## PART 6: AUTONOMY GOVERNANCE

### 6.1 Autonomy Tier Definitions

Summit operates with **explicit autonomy boundaries**. All agent behaviors must declare a tier.

| Tier | Capability | Human Approval | Audit Trail | Kill Switch | Examples |
|------|-----------|----------------|-------------|-------------|----------|
| **0: Observe** | Read-only access | None | Optional | N/A | Metrics dashboards, log viewers |
| **1: Recommend** | Suggest actions | Required before execution | Required | N/A | Policy recommendations, optimization hints |
| **2: Execute** | Perform approved actions | 30s veto window | Required | Available | Auto-remediation, scaling operations |
| **3: Optimize** | Self-tune within bounds | Post-hoc review | Required | Available | Rate limit adjustment, cache tuning |
| **4: Self-Modify** | Change own logic/config | Pre-approved scenarios only | Required | Available | **Disabled by default** |

**Enforcement**:
- All agents must declare tier in agent contract (`agent-contract.json`)
- Tier violations are **runtime-blocked** by policy engine
- Tier 4 is **opt-in only** and requires governance approval

**Default Stance**: **Tier 1** for all new capabilities unless explicitly escalated.

### 6.2 Agent Contract Requirements

Every agent operating in Summit must declare:

```json
{
  "agent_id": "unique-agent-identifier",
  "autonomy_tier": 1,
  "capabilities": ["recommend_policy_change", "analyze_audit_trail"],
  "required_permissions": ["read:policies", "read:audit_logs"],
  "failure_modes": ["timeout", "invalid_input", "policy_violation"],
  "evidence_hooks": ["log_recommendation", "record_decision"],
  "veto_window_seconds": 30,
  "kill_switch_enabled": true
}
```

**Validation**: CI enforces schema compliance for all `agent-contract.json` files.

---

## PART 7: CI/CD HARD GATES

### 7.1 Gate Categories

| Gate Type | Blocking | Workflow | Scope |
|-----------|----------|----------|-------|
| **Build** | ✅ Yes | `ci.yml` | Deterministic build, lint, typecheck |
| **Security** | ✅ Yes | `ci-security.yml` | Secrets, CVEs, dependencies |
| **Policy** | ⚠️ Yes (post-MVP4) | `mvp4-gate.yml` | OPA tests, governance checks |
| **Smoke** | ✅ Yes | `ci.yml` | Golden path integration test |
| **Provenance** | ⚠️ Informational | `ci.yml` | SBOM, SLSA attestation |

**Gate Consolidation Plan (Phase 1)**:
- Collapse workflows into:
  - `ci-core.yml` (lint, typecheck, unit, build)
  - `ci-verify.yml` (security, provenance, compliance)
  - `ci-legacy.yml` (non-blocking, logged for migration)

### 7.2 Merge Requirements (Branch Protection)

```yaml
# .github/branch-protection.yml (enforce via Terraform)
branch: main
required_status_checks:
  - "Lint"
  - "Verification Suite"
  - "Test (unit)"
  - "Test (integration)"
  - "Golden Path"
  - "Reproducible Build"
  - "Security"
  - "MVP-4-GA Promotion Gate"
required_approvals: 2
require_codeowner_reviews: true
dismiss_stale_reviews: true
require_signed_commits: true
```

### 7.3 Determinism Contract

**Build Determinism**:
- Same source → same binary (bit-for-bit)
- Enforced via dual-build checksum comparison
- Violations **block merge**

**Test Determinism**:
- Tests must pass 100% in CI (no flakes allowed in core suite)
- Flaky tests quarantined to `pnpm test:quarantine` (non-blocking)
- Violations tracked, fixed within 1 sprint

---

## PART 8: COMPLIANCE & EVIDENCE AUTOMATION

### 8.1 Control Registry

All compliance controls mapped to:
- **File**: Source of truth for control logic
- **Test**: Automated verification
- **Command**: Reproducible evidence generation
- **Output**: Machine-readable artifact

**Validation Rule**:
> If evidence is not automatable, the control is invalid.

**Control Index Location**: `evidence/CONTROL_REGISTRY.json`

### 8.2 Evidence Generation

```bash
# Generate full evidence bundle
./scripts/generate-evidence-bundle.sh \
  --version ${VERSION} \
  --output evidence-bundle-${VERSION}.tar.gz

# Contents:
# - SBOM (CycloneDX JSON)
# - SLSA Provenance (in-toto)
# - OPA test results
# - Security scan reports
# - Audit trail exports (7-day window)
# - Compliance control verification
```

**Evidence Schema**: See `docs/ga/evidence-bundle-schema.json`

---

## PART 9: DEPLOYMENT & OPERATIONS

### 9.1 Deployment Gates

| Stage | Gate | Rollback Trigger |
|-------|------|------------------|
| **Canary** | 5% traffic, P95 <200ms, errors <0.1% | Any SLO violation |
| **Blue-Green** | 50% traffic, sustained 10min | P95 >300ms or errors >0.5% |
| **Full Rollout** | 100% traffic | P0 incident or data corruption |

**Deployment Runbook**: `docs/ga/DEPLOYMENT.md`
**Rollback Runbook**: `docs/ga/ROLLBACK.md`

### 9.2 Operational Readiness Checklist

**Pre-Deployment** (T-24h):
- [ ] Staging deployment verified
- [ ] Canary tested in staging
- [ ] Rollback tested in staging
- [ ] Performance baseline captured
- [ ] Backup verified (restore tested)
- [ ] War room established
- [ ] On-call team alerted

**During Deployment**:
- [ ] Canary metrics green (10min window)
- [ ] Error budget not breached
- [ ] No P0/P1 alerts fired
- [ ] Rollback plan ready

**Post-Deployment** (T+72h):
- [ ] SLOs met continuously
- [ ] Zero critical incidents
- [ ] User feedback reviewed
- [ ] Retrospective scheduled

---

## PART 10: SIGN-OFF REQUIREMENTS

### 10.1 Technical Sign-Offs (Required for GA)

| Role | Responsibility | Approval Criteria |
|------|---------------|-------------------|
| **Release Captain** | Overall readiness | All gates pass, evidence complete |
| **Security Lead** | Security posture | No critical CVEs, all controls verified |
| **SRE Lead** | Operational readiness | Runbooks tested, SLOs defined |
| **Product Owner** | Feature completeness | MVP scope delivered |
| **Compliance Officer** | Audit trail | 7-year retention configured, controls mapped |

**Sign-Off Location**: `docs/ga/MVP4-GA-MASTER-CHECKLIST.md` Section 9

### 10.2 Executive Sign-Off (Final Authority)

- **VP Engineering**: AUTHORIZE GA / DEFER
- **Threshold**: 95%+ readiness score
- **Evidence**: This document + RELEASE-READINESS-REPORT.md

---

## PART 11: WAIVERS & EXCEPTIONS

### 11.1 Waiver Process

1. **Identify Gap**: Document specific requirement that cannot be met
2. **Assess Risk**: Quantify impact (low/medium/high)
3. **Define Remediation**: Timeline and owner for closure
4. **Obtain Approval**: Security Lead + Release Captain sign-off
5. **Track Exception**: Add to CONTROL_REGISTRY with expiry date

**Waiver Template**:
```markdown
| Requirement | Waiver Reason | Risk | Remediation | Expiry | Approved By |
|-------------|---------------|------|-------------|--------|-------------|
| Example | Example | Medium | Sprint N+2 | 2026-03-01 | Alice, Bob |
```

### 11.2 Accepted Gaps (as of 2026-01-01)

| Gap | Rationale | Remediation Target |
|-----|-----------|-------------------|
| `pnpm audit` disabled | Baseline CVE triage needed | Week 1 post-GA |
| Jest/ts-jest environment | ESM loader issues, CI handles | Month 1 post-GA |
| Error budgets not in Terraform | Prometheus setup required | Week 1 post-GA |

**Stance**: All gaps are **documented and acceptable** per "permissive but documented" guidance.

---

## PART 12: POST-GA COMMITMENTS

### 12.1 Week 1 (Critical)

- [ ] Enable `pnpm audit --audit-level critical` in CI
- [ ] Implement error budgets in Prometheus
- [ ] Create ADR-009 (MVP-4-GA decisions)
- [ ] Monitor SLOs hourly for 72h
- [ ] Zero P0 incidents

### 12.2 Month 1 (High Priority)

- [ ] Resolve Jest/ts-jest issues or migrate to node:test
- [ ] Achieve 100% test pass rate (no quarantine needed)
- [ ] API determinism audit (eliminate unhandled 500s)
- [ ] Type safety audit (eliminate `any` in core paths)

### 12.3 Quarter 1 (Medium Priority)

- [ ] Formal error budgets (Terraform-managed)
- [ ] Adaptive rate limiting based on anomaly detection
- [ ] Executable runbooks (Jupyter notebooks or scripts)
- [ ] Graceful degradation modes for dependencies

---

## PART 13: AMENDMENT PROCESS

### 13.1 Amendment Authority

This document is **immutable** except via formal amendment.

**Amendment Triggers**:
- Critical security vulnerability requiring process change
- Regulatory requirement (e.g., new NIST standard)
- Lesson learned from P0 incident

**Amendment Process**:
1. Create amendment proposal (ADR format)
2. Obtain sign-off from Security Lead + SRE Lead + Release Captain
3. Update this document with version bump
4. Archive prior version to `docs/ga/archive/GA_DEFINITION-v{N}.md`
5. Communicate changes to all stakeholders

### 13.2 Version History

| Version | Date | Changes | Approved By |
|---------|------|---------|-------------|
| 1.0.0 | 2026-01-01 | Initial immutable definition | Release Captain |

---

## PART 14: ENFORCEMENT

### 14.1 Enforcement Mechanisms

| Requirement | Enforcement Point | Failure Mode |
|-------------|------------------|--------------|
| Required Features | `pnpm verify` + CI | **Merge blocked** |
| Required Commands | CI workflows | **Merge blocked** |
| Required Evidence | Pre-release checklist | **Release blocked** |
| Required Docs | CI doc validation | **Merge blocked** |
| Autonomy Tiers | Policy engine (runtime) | **Request rejected** |

### 14.2 Violation Response

| Severity | Response | Owner |
|----------|----------|-------|
| **P0: Security bypass** | Immediate rollback, incident | Security Lead |
| **P1: Gate bypass** | PR revert, process review | Release Captain |
| **P2: Documentation gap** | Issue created, sprint planned | Tech Lead |

---

## CONCLUSION

**GA Readiness = Compliance with ALL sections of this document.**

**Decision Authority**: Release Captain
**Final Arbiter**: VP Engineering
**Threshold**: 95%+ compliance (per `RELEASE-READINESS-REPORT.md`)

**Current Status** (2026-01-01): **95.75%** → ✅ **READY FOR GA**

---

**Questions or Clarifications?** → Open issue with label `ga-definition-question`

**Next Immediate Action**: Review and freeze this document (lock via governance process).
