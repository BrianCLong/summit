# 12-Month Execution Plan: Seven Businesses, One Platform

**Status**: Draft
**Owner**: Platform Engineering
**Target Repo**: `BrianCLong/summit`

## 1.0 Executive Summary

This program converts the "Seven Businesses" strategy into a **repo-shaped execution path**. The core technical goal is **Platform Spine Consolidation**: moving from the current single-tenant, stub-auth `api/` (Python/FastAPI) to a multi-tenant, metered, auditable platform supporting 7 product surfaces.

**Key Constraints:**

* **One Platform**: Shared `api/platform_spine/` for Auth, Tenancy, Metering.
* **Sequenced Shipping**: One product at a time.
* **FactGov**: Implemented as "Audit Pack First" (files over UI) to accelerate government value.
* **Governance**: Adherence to `docs/ci/REQUIRED_CHECKS_POLICY.yml`.

---

## 2.0 Architectural Transition

### Current State (Verified)

* **Runtime**: Python 3.9 / FastAPI (`api/main.py`).
* **Auth**: Single stubbed `API_KEY` (`verify_api_key`).
* **Tenancy**: None (Single Tenant).
* **Observability**: OpenTelemetry present.

### Target State (Month 3)

* **Runtime**: Python 3.9 / FastAPI (unchanged).
* **Auth**: `api/platform_spine/auth` (JWT/OIDC + API Keys).
* **Tenancy**: `api/platform_spine/tenancy` (Schema-per-tenant or Row-level Security).
* **Metering**: `api/platform_spine/metering` (Deterministic `metrics.json`).

---

## 3.0 Execution Phases

### Phase 1: Platform Spine + FactAPI Pro + FactFlow MVP (Months 0–3)

**Goal**: Replace `verify_api_key` stub with proper multi-tenancy and metering.

* **Engineering Outcomes**:
  * `api/platform_spine/auth`: Replace `api/main.py` stub.
  * `api/platform_spine/tenancy`: Enforce tenant context middleware.
  * `api/platform_spine/metering`: Request counting & quota enforcement.
  * `artifacts/platform/`: Deterministic audit artifacts.
* **Repo Deliverables**:
  * `api/platform_spine/`
  * `apps/factflow/` (Thin UI)
  * `api/factapi_pro/`

### Phase 2: FactDatasets + FactLaw (Months 4–6)

**Goal**: Monetize data exports and specialized legal verification.

* **Engineering Outcomes**:
  * `api/factdatasets/`: Export pipeline with licensing audit trail.
  * `api/factlaw/`: Legal-specific verification modules.
  * Billing Provider Interface (Stripe adapter).

### Phase 3: FactMarkets + FactCert + FactGov MVP (Months 7–9)

**Goal**: Launch the "Trust Layer" and Government Procurement.

* **Engineering Outcomes**:
  * `api/factmarkets/`: Prepare for microservice extraction (per ITEM:ARCH-02).
  * `api/factgov/`: **Audit Pack Generator** (PDF/JSON/ZIP).
  * `api/factcert/`: Validator attestation signing.
* **FactGov MVP**:
  * Focus on generating **Audit Packs** for cooperative procurement.
  * Validators sign `artifacts/platform/stamp.json`.

### Phase 4: Consolidation & Scale (Months 10–12)

**Goal**: Unified Console and Investor-Grade Metrics.

* **Engineering Outcomes**:
  * `apps/console/`: Unified admin dashboard.
  * `scripts/monitoring/`: Drift detection for governance.
  * Full "FactMarkets" service extraction if scale warrants.

---

## 4.0 PR Stack (The "Spine" Skeleton)

This sequence establishes the platform spine without breaking existing `api/` functionality immediately.

### PR1: Platform Spine Skeleton

* **Scope**: Create directory structure and standards.
* **Paths**:
  * `api/platform_spine/{auth,tenancy,metering,billing,audit}/README.md`
  * `docs/standards/platform-spine.md`
  * `repo_assumptions.md`

### PR2: Tenancy & Metering Implementation

* **Scope**: Middleware for tenant context and metering.
* **Paths**:
  * `api/platform_spine/tenancy/middleware.py`
  * `api/platform_spine/metering/counter.py`

### PR3: FactAPI Pro Primitives

* **Scope**: Quotas and Concurrency Licensing.
* **Paths**:
  * `api/platform_spine/metering/quota.py`

### PR4: FactFlow MVP

* **Scope**: Thin UI and API routes.
* **Paths**:
  * `apps/factflow/`
  * `api/factflow/`

### PR5: FactDatasets & Audit Chain

* **Scope**: Data export and hash chains.
* **Paths**:
  * `api/factdatasets/`
  * `api/platform_spine/audit/hashchain.py`

### PR6: FactGov & FactCert

* **Scope**: Audit Pack generation and Validator signing.
* **Paths**:
  * `api/factgov/`
  * `api/factcert/`

### PR7: Governance & Drift

* **Scope**: Monitoring and drift detection scripts.
* **Paths**:
  * `scripts/monitoring/`
  * `alerting/`

---

## 5.0 Definition of Done (Month 3)

1. **Tenant Context**: Mandatory on every `api/` request (except healthcheck).
2. **Metering**: `metrics.json` generated deterministically.
3. **Audit**: `stamp.json` links to git SHA and config hash.
4. **CI**: All checks in `docs/ci/REQUIRED_CHECKS_POLICY.yml` pass.
