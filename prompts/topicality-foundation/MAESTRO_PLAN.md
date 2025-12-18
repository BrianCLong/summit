# Topicality Foundation - Maestro Implementation Plan

**Plan Name:** Topicality Foundation Build
**Owner:** Engineering Leadership
**Timeline:** 8 weeks
**Status:** Ready to Start
**Budget:** 8 engineer-weeks

---

## Plan Overview

This Maestro plan orchestrates the implementation of 11 foundational components for the Topicality platform. Each component is defined as a prompt that can be executed by Claude Code.

### Plan Objectives

1. **Build IntelGraph Core** - Entity/claim/provenance data model
2. **Enable Provenance Tracking** - Reusable claim ledger library
3. **Orchestrate Workflows** - Maestro conductor for runs/artifacts
4. **Enforce Governance** - OPA ABAC policy framework
5. **Track KPIs** - Metrics and observability layer
6. **Support Multi-Tenancy** - White-label configuration
7. **Monitor Risk** - Incident and policy violation tracking
8. **Automate Releases** - Disclosure packs and release gates
9. **Generate Reports** - CEO dispatch and canonical templates

### Success Criteria

- [ ] All 11 prompts completed with passing tests
- [ ] Integration tests validate cross-component workflows
- [ ] Documentation complete for each component
- [ ] Golden path validated: Entity → Claim → Provenance → Run → Disclosure Pack
- [ ] At least 1 end-to-end demo scenario working

---

## Runs Overview

| Run ID | Prompt | Owner | Status | Start | End | Artifacts |
|--------|--------|-------|--------|-------|-----|-----------|
| R001 | IntelGraph Core | TBD | Pending | Week 1 | Week 2 | API, Schema, Tests |
| R002 | Claim Ledger Library | TBD | Pending | Week 2 | Week 3 | Library, Types, Examples |
| R003 | Maestro Conductor | TBD | Pending | Week 3 | Week 4 | Service, API, Tests |
| R004 | OPA ABAC Governance | TBD | Pending | Week 3 | Week 4 | Adapter, Policies, Tests |
| R005 | Metrics & Observability | TBD | Pending | Week 3 | Week 4 | Metrics Module, Endpoint |
| R006 | White-Label Config | TBD | Pending | Week 5 | Week 5 | Config Service, API |
| R007 | Risk & Incident Tracker | TBD | Pending | Week 5 | Week 5 | Tracker Service, API |
| R008 | Disclosure Pack Generator | TBD | Pending | Week 7 | Week 7 | CLI Tool, Templates |
| R009 | Release Gate Checker | TBD | Pending | Week 8 | Week 8 | CI Tool, Tests |
| R010 | CEO Daily Dispatch | TBD | Pending | Week 7 | Week 7 | Generator Script, Templates |
| R011 | Canonical Templates | TBD | Pending | Week 7 | Week 8 | Template Engine, Schemas |

---

## Detailed Run Specifications

### Run R001: IntelGraph Core Data Model & Service

**Prompt File:** `01-intelgraph-core.md`
**Priority:** ⭐️ CRITICAL PATH
**Effort:** 2 weeks
**Dependencies:** None
**Blocks:** R002, R003, R004, R005, R006, R007, R008, R009, R010, R011

#### Steps

1. **STEP-001: Stack Selection & Architecture Design**
   - Duration: 2 days
   - Owner: TBD
   - Deliverables:
     - ADR (Architecture Decision Record) for stack choice
     - High-level architecture diagram
     - API surface sketch

2. **STEP-002: Schema Design & Migrations**
   - Duration: 2 days
   - Owner: TBD
   - Deliverables:
     - Database schema (Postgres/Neo4j)
     - Migration scripts
     - ERD/graph model diagram

3. **STEP-003: Core API Implementation**
   - Duration: 4 days
   - Owner: TBD
   - Deliverables:
     - Entity CRUD endpoints
     - Claim CRUD endpoints
     - Provenance attachment APIs
     - Policy label management APIs

4. **STEP-004: Query Implementation**
   - Duration: 2 days
   - Owner: TBD
   - Deliverables:
     - Entity search
     - Claim history queries
     - Provenance trail queries

5. **STEP-005: Testing**
   - Duration: 2 days
   - Owner: TBD
   - Deliverables:
     - Unit tests (80%+ coverage)
     - Integration tests
     - API example scripts

6. **STEP-006: Documentation**
   - Duration: 2 days
   - Owner: TBD
   - Deliverables:
     - README with quickstart
     - API documentation
     - Deployment guide

#### Artifacts

- `intelgraph-core/` - Service codebase
- `intelgraph-core/schema.sql` - Database schema
- `intelgraph-core/docs/` - Documentation
- `intelgraph-core/tests/` - Test suite
- Claim Ledger Manifest: `manifests/R001-intelgraph-core.json`

#### Budget

- Time: 10 business days
- Cost: 1 engineer @ 2 weeks

#### Rollback Plan

If R001 fails:
- Fall back to existing IntelGraph schema
- Document gaps for future iteration
- Triggers:
  - Test coverage < 70%
  - > 5 critical bugs in acceptance testing
  - Schema cannot support provenance model

---

### Run R002: Provenance & Claim Ledger Library

**Prompt File:** `02-provenance-claim-ledger.md`
**Priority:** ⭐️ CRITICAL PATH
**Effort:** 1 week
**Dependencies:** R001
**Blocks:** R003, R008, R009, R010

#### Steps

1. **STEP-001: Type Definitions**
   - Duration: 1 day
   - Deliverables: TypeScript/Pydantic types for Claim, Provenance, PolicyLabels

2. **STEP-002: Core Library Logic**
   - Duration: 2 days
   - Deliverables: Create, validate, serialize claim objects

3. **STEP-003: Backend Client**
   - Duration: 1 day
   - Deliverables: HTTP client for IntelGraph API, file store fallback

4. **STEP-004: Manifest Generation**
   - Duration: 1 day
   - Deliverables: JSON/YAML manifest generator

5. **STEP-005: Examples & Tests**
   - Duration: 2 days
   - Deliverables: Example usage, unit tests, README

#### Artifacts

- `@topicality/claim-ledger` - npm/PyPI package
- `examples/` - Usage examples
- Claim Ledger Manifest: `manifests/R002-claim-ledger.json`

---

### Run R003: Maestro Conductor

**Prompt File:** `03-maestro-conductor.md`
**Priority:** ⭐️ HIGH
**Effort:** 1.5 weeks
**Dependencies:** R001, R002
**Blocks:** R008, R009, R010, R011
**Parallelizable:** Yes (with R004, R005)

#### Steps

1. **STEP-001: Data Model**
   - Duration: 2 days
   - Deliverables: Plan, Run, Step, Artifact schemas

2. **STEP-002: Orchestrator API**
   - Duration: 3 days
   - Deliverables: REST/GraphQL API for run management

3. **STEP-003: Provenance Integration**
   - Duration: 2 days
   - Deliverables: Integration with claim ledger library

4. **STEP-004: Testing & Examples**
   - Duration: 2 days
   - Deliverables: Tests, example run script

#### Artifacts

- `maestro-conductor/` - Service codebase
- Example run: `examples/sample-run.json`
- Claim Ledger Manifest: `manifests/R003-maestro.json`

---

### Run R004: OPA ABAC Governance Layer

**Prompt File:** `04-opa-abac-governance.md`
**Priority:** ⭐️ HIGH
**Effort:** 1 week
**Dependencies:** R001
**Blocks:** All services (auth required)
**Parallelizable:** Yes (with R003, R005)

#### Steps

1. **STEP-001: ABAC Input Model**
   - Duration: 1 day
   - Deliverables: Subject/Resource/Context type definitions

2. **STEP-002: Adapter Implementation**
   - Duration: 2 days
   - Deliverables: OPA HTTP client, authorize() function

3. **STEP-003: Example Policies**
   - Duration: 1 day
   - Deliverables: Rego policies for common scenarios

4. **STEP-004: Integration Examples**
   - Duration: 1 day
   - Deliverables: How to integrate with IntelGraph/Maestro

5. **STEP-005: Testing & Docs**
   - Duration: 2 days
   - Deliverables: Policy tests, README

#### Artifacts

- `@topicality/opa-adapter` - Library
- `policies/` - Example Rego policies
- Claim Ledger Manifest: `manifests/R004-opa-abac.json`

---

### Run R005: Metrics & Observability Skeleton

**Prompt File:** `07-metrics-observability.md`
**Priority:** ⭐️ HIGH
**Effort:** 1 week
**Dependencies:** R001, R002
**Blocks:** R009, R010, R007
**Parallelizable:** Yes (with R003, R004)

#### Steps

1. **STEP-001: KPI Definitions**
   - Duration: 1 day
   - Deliverables: Product/Business/Governance KPI types

2. **STEP-002: Metrics Module**
   - Duration: 2 days
   - Deliverables: Record and store metrics

3. **STEP-003: HTTP Endpoint**
   - Duration: 1 day
   - Deliverables: `/metrics` endpoint (Prometheus-compatible)

4. **STEP-004: Provenance Integration**
   - Duration: 1 day
   - Deliverables: Optional claim ledger for KPIs

5. **STEP-005: Testing & Docs**
   - Duration: 2 days
   - Deliverables: Tests, integration examples, README

#### Artifacts

- `@topicality/metrics` - Metrics library
- Sample metrics service
- Claim Ledger Manifest: `manifests/R005-metrics.json`

---

### Run R006: White-Label Configuration Engine

**Prompt File:** `11-white-label-configuration.md`
**Priority:** Medium
**Effort:** 1 week
**Dependencies:** R001, R004
**Blocks:** R010, R011
**Parallelizable:** Yes (with R007)

#### Steps

1. **STEP-001: Config Data Model**
   - Duration: 2 days
   - Deliverables: Tenant, BrandingConfig, MetricsConfig, PolicyBundleConfig schemas

2. **STEP-002: Config API**
   - Duration: 2 days
   - Deliverables: CRUD endpoints with validation

3. **STEP-003: Integration Examples**
   - Duration: 1 day
   - Deliverables: How CEO Dispatch uses tenant config

4. **STEP-004: Testing & Docs**
   - Duration: 2 days
   - Deliverables: Multi-tenant test scenarios, README

#### Artifacts

- `tenant-config-service/` - Service codebase
- Example configs for 2 tenants
- Claim Ledger Manifest: `manifests/R006-white-label.json`

---

### Run R007: Risk & Incident Tracker

**Prompt File:** `10-risk-incident-tracker.md`
**Priority:** Medium
**Effort:** 1 week
**Dependencies:** R001, R004, R005
**Blocks:** R009, R010
**Parallelizable:** Yes (with R006)

#### Steps

1. **STEP-001: Data Model**
   - Duration: 2 days
   - Deliverables: Incident, PolicyViolation, Attestation schemas

2. **STEP-002: Tracker API**
   - Duration: 2 days
   - Deliverables: CRUD + weekly summary endpoints

3. **STEP-003: Integration Stubs**
   - Duration: 1 day
   - Deliverables: How services record violations

4. **STEP-004: Testing & Docs**
   - Duration: 2 days
   - Deliverables: Tests, example summary, README

#### Artifacts

- `risk-tracker-service/` - Service codebase
- Sample weekly risk report
- Claim Ledger Manifest: `manifests/R007-risk-tracker.json`

---

### Run R008: Disclosure Pack Generator

**Prompt File:** `05-disclosure-pack-generator.md`
**Priority:** ⭐️ RELEASE BLOCKER
**Effort:** 1 week
**Dependencies:** R002, R003
**Blocks:** R009
**Parallelizable:** Yes (with R010, R011)

#### Steps

1. **STEP-001: CLI Design**
   - Duration: 1 day
   - Deliverables: Command structure, argument parsing

2. **STEP-002: SBOM Generation**
   - Duration: 2 days
   - Deliverables: Integrate with syft/npm ls

3. **STEP-003: SLSA Provenance**
   - Duration: 2 days
   - Deliverables: Git metadata, build info collector

4. **STEP-004: Pack Assembly**
   - Duration: 1 day
   - Deliverables: JSON/YAML + Markdown output

5. **STEP-005: CI Integration & Tests**
   - Duration: 1 day
   - Deliverables: GitHub Actions example, tests

#### Artifacts

- `disclosure-pack-cli/` - CLI tool
- Example disclosure pack: `examples/sample-pack.json`
- CI workflow: `.github/workflows/disclosure-pack.yml`
- Claim Ledger Manifest: `manifests/R008-disclosure-pack.json`

---

### Run R009: Release Gate Checker

**Prompt File:** `08-release-gate-checker.md`
**Priority:** ⭐️ RELEASE BLOCKER
**Effort:** 3 days
**Dependencies:** R008, R005, R007
**Blocks:** Production releases
**Parallelizable:** No

#### Steps

1. **STEP-001: Validation Logic**
   - Duration: 1 day
   - Deliverables: Check functions for each gate requirement

2. **STEP-002: CLI Implementation**
   - Duration: 1 day
   - Deliverables: CLI with pass/fail exit codes

3. **STEP-003: CI Integration & Tests**
   - Duration: 1 day
   - Deliverables: GitHub Actions job, test suite

#### Artifacts

- `release-gate-checker/` - CLI tool
- CI workflow step
- Sample reports (pass/fail)
- Claim Ledger Manifest: `manifests/R009-release-gate.json`

---

### Run R010: CEO Daily Dispatch Generator

**Prompt File:** `06-ceo-daily-dispatch.md`
**Priority:** Medium
**Effort:** 3 days
**Dependencies:** R003, R005, R007
**Blocks:** None
**Parallelizable:** Yes (with R009, R011)

#### Steps

1. **STEP-001: Data Interfaces**
   - Duration: 1 day
   - Deliverables: Metrics/Maestro client stubs

2. **STEP-002: Template & Generator**
   - Duration: 1 day
   - Deliverables: Markdown template, generation logic

3. **STEP-003: Testing & Examples**
   - Duration: 1 day
   - Deliverables: Sample data, generated dispatch, tests

#### Artifacts

- `ceo-dispatch-generator/` - Script/service
- Sample dispatch: `examples/dispatch-2025-11-22.md`
- Claim Ledger Manifest: `manifests/R010-ceo-dispatch.json`

---

### Run R011: Canonical Output Templates

**Prompt File:** `09-canonical-output-templates.md`
**Priority:** Medium
**Effort:** 4 days
**Dependencies:** R001, R003, R006
**Blocks:** None
**Parallelizable:** Yes (with R009, R010)

#### Steps

1. **STEP-001: Schema Definitions**
   - Duration: 1 day
   - Deliverables: JSON schemas for 3 doc types

2. **STEP-002: Templates**
   - Duration: 1 day
   - Deliverables: Markdown templates

3. **STEP-003: Generator Implementation**
   - Duration: 1 day
   - Deliverables: Validation + rendering logic

4. **STEP-004: Examples & Tests**
   - Duration: 1 day
   - Deliverables: Sample inputs/outputs, tests

#### Artifacts

- `canonical-templates/` - Template engine
- `templates/` - CEO Dispatch, Board One-Pager, Execution Order
- `examples/` - Generated samples
- Claim Ledger Manifest: `manifests/R011-templates.json`

---

## Weekly Execution Plan

### Week 1-2: Foundation Sprint
**Focus:** IntelGraph Core (R001)

**Monday Week 1:**
- Kick off R001
- Stack selection and architecture design (STEP-001)

**Wednesday Week 1:**
- Complete schema design (STEP-002)
- Begin API implementation (STEP-003)

**Monday Week 2:**
- Continue API implementation (STEP-003)
- Begin query implementation (STEP-004)

**Wednesday Week 2:**
- Complete queries (STEP-004)
- Begin testing (STEP-005)

**Friday Week 2:**
- Complete testing and documentation (STEP-005, STEP-006)
- **GATE: R001 acceptance - proceed to Week 3 only if passed**

---

### Week 3-4: Platform Sprint
**Focus:** Maestro (R003), OPA (R004), Metrics (R005)

**Monday Week 3:**
- Kick off R002 (Claim Ledger) - dependency for others
- Complete by Wednesday

**Wednesday Week 3:**
- **Parallel kick-off:**
  - R003: Maestro (Session 1)
  - R004: OPA ABAC (Session 2)
  - R005: Metrics (Session 3)

**Friday Week 3:**
- Checkpoint: All three runs at 50%
- Integration discussion

**Week 4:**
- Continue parallel execution
- Integration testing between R003/R004/R005
- **GATE: Platform services functional - proceed to Week 5 only if passed**

---

### Week 5: Application Features Sprint
**Focus:** White-Label (R006), Risk Tracker (R007)

**Monday Week 5:**
- **Parallel kick-off:**
  - R006: White-Label Config (Session 1)
  - R007: Risk Tracker (Session 2)

**Friday Week 5:**
- Complete both runs
- Integration with platform services
- **GATE: Application features ready**

---

### Week 6: Integration & Hardening
**Focus:** End-to-end testing, bug fixes

**Activities:**
- Integration tests across all components
- Performance testing
- Security review
- Documentation cleanup
- **GATE: System ready for automation layer**

---

### Week 7: Automation Sprint (Part 1)
**Focus:** Disclosure Pack (R008), CEO Dispatch (R010), Templates (R011)

**Monday Week 7:**
- **Parallel kick-off:**
  - R008: Disclosure Pack (Session 1) - CRITICAL
  - R010: CEO Dispatch (Session 2)
  - R011: Templates (Session 3)

**Friday Week 7:**
- R008 must complete (blocks R009)
- R010, R011 can carry into Week 8

---

### Week 8: Automation Sprint (Part 2) & Launch Prep
**Focus:** Release Gate (R009), Final Integration

**Monday Week 8:**
- Kick off R009 (Release Gate Checker)
- Depends on completed R008

**Wednesday Week 8:**
- Complete R009
- Final integration tests
- **GATE: Release automation functional**

**Friday Week 8:**
- Demo preparation
- Launch readiness review
- **FINAL GATE: System launch ready**

---

## Risk Management

### Critical Path Risks

| Risk | Impact | Mitigation | Owner |
|------|--------|------------|-------|
| R001 (IntelGraph Core) delays | HIGH - blocks all | Daily standups, clear requirements | TBD |
| R002 (Claim Ledger) integration issues | HIGH - blocks provenance | Early integration tests with R001 | TBD |
| Parallel runs (R003/R004/R005) conflicts | MEDIUM | Clear API contracts, integration testing | TBD |
| R008 (Disclosure Pack) blocks R009 | MEDIUM | Start R008 early, buffer time | TBD |
| Stack choice mismatch | HIGH | ADR approval before coding | TBD |

### Rollback Triggers

**Per-Run Triggers:**
- Test coverage < 70%
- > 3 critical bugs in acceptance
- Integration tests fail
- Performance degrades > 50% vs baseline

**Plan-Level Triggers:**
- > 2 runs fail acceptance in same tier
- Week 6 integration gate fails
- Critical security finding

### Rollback Plan

If plan fails:
1. Preserve all completed artifacts
2. Document learnings in `RETROSPECTIVE.md`
3. Identify minimum viable subset for V2
4. Re-plan with reduced scope

---

## Budget Tracking

| Run | Budgeted Time | Budgeted Cost | Actual Time | Actual Cost | Variance |
|-----|---------------|---------------|-------------|-------------|----------|
| R001 | 10 days | $15,000 | TBD | TBD | TBD |
| R002 | 5 days | $7,500 | TBD | TBD | TBD |
| R003 | 7 days | $10,500 | TBD | TBD | TBD |
| R004 | 5 days | $7,500 | TBD | TBD | TBD |
| R005 | 5 days | $7,500 | TBD | TBD | TBD |
| R006 | 5 days | $7,500 | TBD | TBD | TBD |
| R007 | 5 days | $7,500 | TBD | TBD | TBD |
| R008 | 5 days | $7,500 | TBD | TBD | TBD |
| R009 | 3 days | $4,500 | TBD | TBD | TBD |
| R010 | 3 days | $4,500 | TBD | TBD | TBD |
| R011 | 4 days | $6,000 | TBD | TBD | TBD |
| **Total** | **57 days** | **$85,500** | **TBD** | **TBD** | **TBD** |

*Assumes $1,500/day blended engineering rate*

---

## Acceptance Criteria (Plan Level)

- [ ] All 11 runs completed with status = "succeeded"
- [ ] All run artifacts have claim ledger manifests
- [ ] End-to-end golden path validated:
  - [ ] Create entity in IntelGraph
  - [ ] Add claim with provenance using Claim Ledger
  - [ ] Create Maestro run that references entity
  - [ ] Generate disclosure pack for release
  - [ ] Pass release gate check
  - [ ] Generate CEO dispatch with metrics
- [ ] Integration tests pass (>90%)
- [ ] Security review completed (ABAC policies enforced)
- [ ] Documentation complete:
  - [ ] README for each component
  - [ ] Integration guide
  - [ ] Deployment guide
- [ ] Demo prepared for stakeholders

---

## Claim Ledger Manifests

Each run will generate a claim ledger manifest stored in `/manifests/{run-id}.json`:

```json
{
  "run_id": "R001",
  "plan_id": "topicality-foundation",
  "artifact_type": "service",
  "artifact_name": "intelgraph-core",
  "claims": [
    {
      "claim_id": "C001-001",
      "entity_id": "topicality-platform",
      "property": "has_component",
      "value": "intelgraph-core-v1.0.0",
      "timestamp": "2025-11-22T00:00:00Z",
      "actor": "claude-code",
      "status": "verified",
      "provenance": {
        "sources": [
          {"type": "git_commit", "value": "abc123..."},
          {"type": "test_report", "url": "file://test-results.xml"}
        ],
        "ingestion_pipeline": "prompt-01-intelgraph-core",
        "method": "automated",
        "confidence": 0.95
      },
      "policy_labels": {
        "origin": "internal",
        "sensitivity": "low",
        "legal_basis": "legitimate_interest"
      }
    }
  ]
}
```

---

## Next Actions

1. **Assign owners** for R001 (IntelGraph Core)
2. **Set start date** for Week 1 sprint
3. **Provision infrastructure**:
   - Dev environment for IntelGraph
   - CI/CD pipeline setup
   - Monitoring/logging infrastructure
4. **Kick off R001** using prompt `01-intelgraph-core.md`
5. **Schedule daily standups** for duration of plan

---

**Plan Status:** ✅ Ready to Execute
**Last Updated:** 2025-11-22
**Next Review:** End of Week 2 (R001 completion)
