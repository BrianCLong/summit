# GA Recapture State Document

**Generated:** 2026-01-29
**Purpose:** Establish ground truth for GA readiness and track recovery progress

---

## Phase 0: Ground Truth

### Current HEAD and Branch

| Property     | Value                                      |
| ------------ | ------------------------------------------ |
| Branch       | `claude/repo-state-capture-MVPc4`          |
| HEAD         | `87013591997a469e912b7f34883d2df2c7d540dc` |
| Version      | `5.2.77`                                   |
| Working Tree | Clean                                      |

### Toolchain Status

| Tool            | Version  | Status        |
| --------------- | -------- | ------------- |
| Node.js         | v22.22.0 | Available     |
| pnpm            | 10.26.0  | Available     |
| Python          | 3.11.14  | Available     |
| Docker          | -        | NOT AVAILABLE |
| gh (GitHub CLI) | -        | NOT AVAILABLE |
| cosign          | -        | NOT AVAILABLE |
| syft            | -        | NOT AVAILABLE |

### Missing Tooling Prerequisites

1. **Docker** - Required for `make up`, `make smoke`, and full GA gate
2. **gh (GitHub CLI)** - Required for PR enumeration and automated operations
3. **cosign** - Required for artifact signing and attestation
4. **syft** - Required for SBOM generation

---

## Detected GA Commands and Workflows

### Makefile GA Targets

| Target                      | Purpose                        | Dependencies                                             |
| --------------------------- | ------------------------------ | -------------------------------------------------------- |
| `make ga`                   | Run enforceable GA gate        | ga-gate.sh, ga-evidence, ga-validate-evidence, ga-report |
| `make ga-verify`            | GA tier B/C verification sweep | testing/ga-verification/\*.ga.test.mjs                   |
| `make ga-evidence`          | Create stub evidence bundle    | scripts/evidence/create_stub_evidence_bundle.mjs         |
| `make ga-validate-evidence` | Validate control evidence      | validate_control_evidence.mjs                            |
| `make ga-report`            | Generate SOC evidence report   | generate_soc_report.py                                   |
| `make claude-preflight`     | Fast local checks before GA    | lint, typecheck, unit tests                              |

### GA Gate Script Analysis (`scripts/ga-gate.sh`)

The GA gate runs these checks in sequence:

1. **Lint and Test** - `NODE_ENV=test make lint test`
2. **Clean Environment** - `make down`
3. **Services Up** - `make up`
4. **Readiness Check** - `wait_for_ready` (curl localhost:8080/health/ready)
5. **Deep Health Check** - `check_detailed_health` (localhost:8080/health/detailed)
6. **Smoke Test** - `make smoke`
7. **Security Check** - SBOM + secret scan

### Active GitHub Workflows (Non-Archived)

Key GA-related workflows:

- `ga-gate.yml` - Main GA gate workflow
- `ga-evidence-attest.yml` - Evidence attestation
- `ga-evidence-pack.yml` - Evidence packaging
- `evidence-check.yml` - Evidence verification
- `evidence-collection.yml` - Evidence gathering
- `evidence-id-consistency.yml` - Evidence ID validation
- `release-ga.yml` - GA release workflow
- `deploy-ga.yml` - GA deployment
- `gates.yml` - Combined gates
- `pr-gates.yml` - PR gates
- `mvp4-gate.yml` - MVP4 specific gate
- `supplychain-gates.yml` - Supply chain security
- `post-deploy-gate.yml` - Post-deployment checks

---

## Recent Merged PR Inventory (Last 50)

### High-Priority PRs (Evidence & GA-Related)

| PR#    | Title                                                       | Area         |
| ------ | ----------------------------------------------------------- | ------------ |
| #17026 | Privacy-Preserving Graph Analytics Foundation               | Core         |
| #17025 | Subsume Resilient Intelligence Pipeline                     | Core         |
| #17023 | Add Angular Skills Governance and Subsumption Bundle        | Governance   |
| #17022 | Add golden path E2E test harness                            | Testing      |
| #17021 | Add Psychographic Signals module foundation                 | Feature      |
| #17020 | PR1 Foundation: Evidence Schemas and Discovery              | Evidence     |
| #17019 | GNN influence campaigns and federation contracts            | Feature      |
| #17018 | Implement Moltbot capabilities with security gates          | Security     |
| #17015 | Post-Deploy Monitoring Gate                                 | Gates        |
| #17014 | Add golden path e2e test suite                              | Testing      |
| #17013 | Evidence scaffolding and schema updates (PR1)               | Evidence     |
| #17047 | Implement CogSec Foundation (Schema, Model, Dual-Use Guard) | Security     |
| #17027 | Add evidence schemas and verifier for Graph Explainability  | Evidence     |
| #17017 | Initialize Foundry Package and Core Data Models             | Core         |
| #17016 | Evidence system scaffolding and CI gates                    | Evidence     |
| #17007 | Foundation for 5x agentic coding (Evidence + Evals)         | Evals        |
| #17003 | Add aidisinfo25 misinfo defense bundle                      | Subsumption  |
| #17001 | Implement CycloneDX SBOM attestation with Cosign            | Supply Chain |

### Infrastructure & CI PRs

| PR#    | Title                                                  | Area       |
| ------ | ------------------------------------------------------ | ---------- |
| #16998 | Production-harden Dockerfile and add go-live readiness | DevOps     |
| #16993 | Add SSDF v1.2 alignment bundle and verifier            | Compliance |
| #16992 | Add MCP Apps Subsumption Bundle                        | Platform   |
| #16983 | Foundation: Automation Turn #6 Subsumption Bundle      | Automation |
| #16978 | Add supply chain guardrails and gates                  | Security   |
| #16974 | Implement Project 19 items 2-5 (Resilience Engine)     | Resilience |
| #16975 | Claude Code Swarm Orchestration Skill                  | AI         |
| #16982 | Add narrative-ops-detection subsumption bundle         | Security   |
| #16922 | Stabilize workflows, add GA gate, align Jest config    | CI         |
| #16808 | Establish observable baseline pipeline                 | CI         |
| #16774 | Resurrect CI workflow and establish green baseline     | CI         |

---

## Existing Evidence Infrastructure

### Evidence Directory Structure

```
evidence/
├── EVIDENCE_INDEX.md
├── GA_EVIDENCE_DASHBOARD.md
├── README.md
├── azure-turin-v7/
├── ci/
├── compliance_report.json
├── context/
├── ecosystem/
├── evidence-index.json
├── fixtures/
├── ga-evidence-manifest.json
├── governance/
├── governance-bundle.json
├── index.json
├── jules/
├── mcp/
├── mcp-apps/
├── metrics.json
├── packs/
├── project19/
├── provenance.json
├── release_abort_events.json
├── report.json
├── resilience_decisions.json
├── runs/
├── runtime/
├── schemas/
├── stamp.json
├── subsumption/
├── taxonomy.stamp.json
└── validate.py
```

### Evidence Scripts

| Script                                | Purpose                         |
| ------------------------------------- | ------------------------------- |
| `create_stub_evidence_bundle.mjs`     | Create minimal evidence bundle  |
| `generate_control_evidence_index.mjs` | Index control evidence          |
| `generate_evidence_bundle.mjs`        | Full evidence bundle generation |
| `generate_soc_report.py`              | SOC compliance report           |
| `validate_control_evidence.mjs`       | Validate evidence completeness  |
| `verify_evidence_bundle.mjs`          | Verify bundle integrity         |

---

## Initial Risk List

### Critical Blockers

1. **Docker Not Available** - Cannot run full GA gate (`make up`, `make smoke`)
2. **gh CLI Not Available** - Cannot enumerate GitHub PR state or create PRs
3. **cosign/syft Missing** - Cannot sign artifacts or generate SBOMs

### High Priority

4. **Unknown CI State** - Need to run `pnpm test` to verify test suite health
5. **Unknown Lint State** - Need to run `pnpm lint` to verify code quality
6. **Evidence Bundle Freshness** - Need to verify evidence bundle matches HEAD

### Medium Priority

7. **Typecheck Status** - Need to verify TypeScript compilation
8. **Security Scan Status** - Need to run security checks (without Docker)

---

## GA Delta Candidates (Preliminary)

Based on Phase 0 findings, the following items may require attention:

1. **Tooling Setup** - Document missing prerequisites and provide fallback commands
2. **Evidence Bundle Regeneration** - Create fresh evidence bundle for current HEAD
3. **Offline GA Verification** - Create non-Docker GA verification path
4. **CI Parity Check** - Compare local checks with CI workflow expectations

---

## Next Steps (Phase 1)

Run available gates and capture logs:

```bash
# Lint (should work)
pnpm lint 2>&1 | tee evidence/ga-recapture/phase1/lint.log

# Typecheck (should work)
pnpm typecheck 2>&1 | tee evidence/ga-recapture/phase1/typecheck.log

# Unit tests (should work)
pnpm test 2>&1 | tee evidence/ga-recapture/phase1/test.log

# Claude preflight (partial - no Docker)
make claude-preflight 2>&1 | tee evidence/ga-recapture/phase1/preflight.log

# GA verify (offline components)
pnpm ga:verify 2>&1 | tee evidence/ga-recapture/phase1/ga-verify.log
```

---

_Document created as part of GA Recapture Phase 0. Updates will be appended as phases progress._
