# Backlog & Sprint Plans

## 1. Backlog Structure

- **Epics**: Strategic Initiatives (Quarterly).
- **Features**: Deliverable capabilities (Monthly).
- **Stories**: Sized tasks for Agents/Devs (Sprint).

## 2. Sprint 0: Genesis (The Bootup)

**Goal**: Instantiate the skeleton of CompanyOS, establish governance, and get the lights on.

### User Stories

| ID        | Title                             | Description                                                                                      | Acceptance Criteria                                                   | Owner       | Priority |
| :-------- | :-------------------------------- | :----------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------- | :---------- | :------- |
| **S0-01** | **Repo & Dir Structure Init**     | Create the canonical directory structure (`platform/`, `companyos/`, `governance/`) and READMEs. | All folders exist; READMEs describe purpose; `CODEOWNERS` updated.    | MC-ARCH     | P0       |
| **S0-02** | **Governance Kernel v1**          | Implement the initial OPA policy bundle for "Mission Lock" and basic Tenant Isolation.           | `.rego` files for tenant isolation exist; tests pass.                 | GOV-STEWARD | P0       |
| **S0-03** | **Maestro Task Graph Engine**     | Wire up the basic `Maestro` engine to read Task Graph Templates from YAML.                       | Maestro can parse `FLOW_FEATURE_LIFECYCLE` example without error.     | MC-ARCH     | P0       |
| **S0-04** | **IntelGraph Schema Bootstrap**   | Define the Core Entity Schema (Tenant, User, Feature, Incident) in Neo4j.                        | Schema applied; `CALL db.schema.visualization()` shows correct nodes. | IG-ARCH     | P0       |
| **S0-05** | **Ops Console Hello World**       | Deploy a minimal React shell for the Ops Console with a "System Status" page.                    | Page loads; shows "System Online"; connects to backend health check.  | PX-UX       | P1       |
| **S0-06** | **Securiteyes Base Signals**      | Configure Securiteyes to ingest system logs and flag "Root Login" events.                        | Ingest pipeline active; root login triggers alert in log.             | SEC-DEF     | P1       |
| **S0-07** | **Aurelius Signal Miner**         | Create a basic script to count "New Code Commits" as a proxy for Innovation Signals.             | Script runs; outputs daily commit count to IntelGraph.                | AUR-TEAM    | P2       |
| **S0-08** | **Summitsight "Pulse" Dashboard** | Create a Grafana dashboard showing CPU, Memory, and Request Rate.                                | Dashboard JSON committed; panels show data.                           | SSIGHT      | P1       |
| **S0-09** | **Tenant Onboarding CLI**         | Build a CLI tool to run the "New Tenant" flow manually (mocked).                                 | `maestro-cli tenant:create` returns success message.                  | MaaS-OPS    | P2       |
| **S0-10** | **CI/CD Pipeline Skeleton**       | Setup GitHub Actions for Build, Test, and Policy Check.                                          | PRs trigger build; failure blocks merge.                              | MC-ARCH     | P0       |

## 3. Roadmap: Sprints 1-3

### Sprint 1: Core Orchestration & Observability

**Theme**: "The Brain Comes Alive"

- **Epics**:
  - Maestro Autonomic Core v1 (Self-healing basic)
  - Summitsight Data Warehouse (Postgres/DuckDB setup)
- **Rationale**: We need reliable execution (Maestro) and visibility (Summitsight) before we can scale or defend.

### Sprint 2: First Defensive & IP Layers Online

**Theme**: "Shields Up, Eyes Open"

- **Epics**:
  - Securiteyes Detection Engine v1 (Real rules)
  - Aurelius Invention Miner v1 (NLP on commits/docs)
- **Rationale**: Once core ops are stable, we immediately secure the perimeter and start capturing value (IP).

### Sprint 3: Executive Dashboards & Governance Reporting

**Theme**: "The Cockpit"

- **Epics**:
  - Ops Console v1 (Full Tenant View)
  - Governance Drift Monitor (Automated reporting)
- **Rationale**: Provide leadership (and the Board) with proof of stability and mission alignment.

### Sprint 4: CompanyOS “Scale & Sell” Sprint

**Dates**: Mon **Feb 9, 2026 → Fri Feb 20, 2026**  
**Theme**: _“Turn the platform into a product.”_ Multi-tenant foundations, regional controls,
packaging, and a measurable performance/cost model.

**Sprint goal**: Deliver a white-labelable, multi-tenant runtime slice with region/residency
enforcement, tenant isolation controls, and a customer-ready “Day 0 → Day 2” ops package
(runbooks, dashboards, evidence exports).

**Success metrics (targets)**:

- **Multi-tenant:** 1 shared control plane + **2 tenants** onboarded in staging with isolation checks
- **Residency:** policy-enforced **region allowlist** per tenant (deploy denied when violated)
- **Cost model:** cost per tenant/unit computed nightly with attribution labels
- **Perf budget:** baseline p95 latency + error rate tracked; regression gates defined (warn → gate)
- **Packaging:** one command (or one script) to stand up “trial environment” + produce disclosure pack

#### Committed epics

**Epic 1 — Tenant Isolation & Multi-Tenant Controls v1**

- **Outcome**: Tenants are first-class and separated by default.
- **Stories**
  - **TEN-1:** Tenant identity model (tenant_id everywhere)  
    **AC:** requests/events/logs/metrics include `tenant_id`; audit schema updated; policy can reason
    on tenant.
  - **TEN-2:** Isolation boundary implementation (pick 1: namespace/account/project)  
    **AC:** tenant resources are created in isolated boundary; no cross-tenant access without explicit
    policy exception.
  - **TEN-3:** “Tenant admin” role + ABAC rules  
    **AC:** tenant admin can manage only their tenant; platform admin actions are fully audited.
- **Evidence**
  - Tenant threat model (cross-tenant data bleed, confused deputy)
  - Automated isolation test suite (deny cases included)

**Epic 2 — Data Residency & Region Controls v1 (real enforcement)**

- **Outcome**: “Wrong region” becomes impossible, not discouraged.
- **Stories**
  - **REG-1:** Tenant residency declaration + policy enforcement  
    **AC:** tenant has `allowed_regions`; deploy denied if env/cluster region not allowed.
  - **REG-2:** Data store residency tagging + deny rules  
    **AC:** storage resources are tagged with region/residency; policy blocks creation/use outside
    allowlist.
  - **REG-3:** Residency evidence in disclosure pack  
    **AC:** disclosure pack includes tenant residency declaration + proof of deploy region + policy
    decision log.
- **Evidence**
  - One staged “deny” demo: attempt to deploy Tenant A into forbidden region
  - Residency compliance report artifact

**Epic 3 — Performance & Cost Model v1 (portfolio-grade numbers)**

- **Outcome**: We can answer “what does it cost, and what’s the latency budget?” per tenant.
- **Stories**
  - **COST-1:** Cost attribution labels (tenant/service/env)  
    **AC:** every workload has labels; cost pipeline produces daily rollups by tenant/service/env.
  - **COST-2:** KPI dashboard (cost per tenant, cost per request/unit)  
    **AC:** dashboard exists; top 5 cost drivers visible; exportable CSV/JSON.
  - **PERF-1:** Performance budget spec + tracking  
    **AC:** define baseline p50/p95 + error rate; regressions produce warnings; gate criteria drafted.
- **Evidence**
  - “Platform P&L” dashboard screenshot/export
  - ADR: performance and cost budgets + gating phases

**Epic 4 — White-Label Packaging & “Day 2 Ops” Kit v1**

- **Outcome**: A customer (or internal team) can adopt with minimal hand-holding.
- **Stories**
  - **PACK-1:** Installation bundle / trial environment launcher  
    **AC:** one script/command provisions a staging environment with defaults + least privilege
    identity.
  - **PACK-2:** Customer-facing runbook pack (Day 2 ops)  
    **AC:** runbooks for deploy/rollback, incident response, audit export, user provisioning, policy
    troubleshooting.
  - **PACK-3:** Branding hooks (minimal)  
    **AC:** config supports name/logo/theme placeholders; docs describe how to white-label safely
    (no code fork required).
- **Evidence**
  - “Day 0 → Day 2” operator guide (PDF/MD)
  - Trial environment demo + teardown evidence

#### Sprint cadence

- **Mon Feb 9:** Kickoff + choose isolation boundary (namespace/account/project) and define tenant IDs
- **Wed Feb 11:** Design review (tenant model + residency enforcement points)
- **Fri Feb 13:** Mid-sprint demo: 2 tenants running + audit events show tenant separation
- **Tue Feb 17:** Cost/perf dashboard review + regression thresholds draft
- **Fri Feb 20:** Evidence review + “customer trial” dry-run (someone not on the core team runs
  PACK-1)

#### Risks (and mitigations)

- **Tenant isolation too big** → ship one strong boundary first; document future boundary options.
- **Residency policies block dev velocity** → allow “dev tenant” with permissive regions; keep prod
  tenants strict.
- **Cost attribution messy** → start with coarse labels + daily aggregation; refine later with
  request-level metering.

#### Definition of Done (sprint-level)

- Two tenants can be created, deployed, observed, and audited with **no cross-tenant visibility**
- Deploys are **region-policy gated**
- Cost and performance dashboards exist with **tenant-level rollups**
- Packaging can stand up and tear down an environment repeatably, producing a disclosure pack
