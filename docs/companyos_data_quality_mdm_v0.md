# CompanyOS Data Quality & MDM v0

## Purpose and scope

- Establish an enterprise-wide blueprint for master data management (MDM), reference data governance, and data quality controls across CompanyOS.
- Govern the core master entities: **tenant, org, user, asset, policy, product/plan**.
- Provide golden record strategy, identity resolution rules, and operating controls for data quality and reference data lifecycle.

## MDM scope and models

### Master entities

- **Tenant**: legal customer instance of CompanyOS; canonical identifiers: `tenant_id` (UUID, primary key), `tenant_slug` (unique), `billing_account_id` (nullable), `crm_account_id`.
- **Org**: hierarchical units within a tenant; canonical identifiers: `org_id` (UUID), `org_path` (hierarchical code), `parent_org_id`.
- **User**: human or service actor; canonical identifiers: `user_id` (UUID), `primary_email`, `federated_subject_id`, `employee_id` (nullable), `phone_e164` (optional).
- **Asset**: managed resource (device, dataset, workload); canonical identifiers: `asset_id` (UUID), `asset_type`, `provider_resource_id`, `provider_account_id`.
- **Policy**: access or compliance constraint; canonical identifiers: `policy_id` (UUID), `policy_key` (unique within tenant), `version` (semantic).
- **Product/Plan**: SKU or plan definition; canonical identifiers: `product_id` (UUID), `sku`, `plan_code`, `version`.

### Golden record strategy

- **System of record (SoR)**
  - Tenants/orgs/users: CRM + IdP as authoritative for identity; provisioning service writes canonical rows.
  - Assets: cloud provider inventory or CMDB as SoR; ingestion normalizes to canonical schema.
  - Policy: policy service registry is SoR; versions immutable after publish.
  - Product/Plan: pricing/catalog service is SoR with lifecycle statuses (draft/active/deprecated).
- **Survivorship rules (priority order applied field-by-field)**
  1. Explicit admin correction in MDM override (highest precedence, time-stamped and attributed).
  2. Source marked as _authoritative_ for the field (e.g., IdP for `primary_email`, CRM for `billing_account_id`).
  3. Most recent event with valid signature + freshness SLA satisfied.
  4. Source trust score (per-source weighting, e.g., IdP 0.9 > CRM 0.8 > telemetry 0.6).
  5. Least null / most complete record.
  6. Tie-breaker: deterministic hash of source + event time for stable outcomes.

### Identity resolution and deduplication

- **Deterministic keys**
  - Tenant: match on `tenant_slug` or `billing_account_id` + `crm_account_id` if both present.
  - Org: match on (`tenant_id`, `org_path`) or (`tenant_id`, `legacy_org_code`).
  - User: match on case-insensitive `primary_email`; fallback on (`tenant_id`, `federated_subject_id`) or (`tenant_id`, `employee_id`).
  - Asset: match on (`provider_account_id`, `provider_resource_id`, `asset_type`).
- **Probabilistic signals (when deterministic keys absent/changed)**
  - Email similarity (Levenshtein/Jaro-Winkler) + domain match for users.
  - Name similarity (first/last), phone normalization, and org affiliation strength.
  - Device fingerprint or hostname similarity for assets; network and tag overlaps.
  - CRM account name + billing address similarity for tenants.
- **Deduplication rules**
  - Blocks creation when deterministic match found; surface merge recommendations when probabilistic score ≥ threshold (e.g., 0.92).
  - Preserve lineage: store source record IDs and merge graph; maintain reversible merges.
  - Emit `mdm.merge.proposed` and `mdm.merge.accepted` events for auditability.

## Data quality controls

### Dimensions & SLAs

- **Completeness**: required fields populated per entity (see rules below); ≥ 99% completeness for golden record attributes.
- **Consistency**: schema version compatibility; reference code validity; cross-entity integrity (tenant→org→user). Violation rate < 0.5% per day.
- **Timeliness**: ingestion-to-canonical latency < 5 minutes for identities; < 15 minutes for assets; policy/catalog updates < 2 minutes.
- **Accuracy**: trusted-source parity ≥ 99.5% for authoritative fields; drift alerts when mismatch frequency exceeds 0.5%.
- **Uniqueness**: zero duplicate golden keys; dedupe backlog SLA < 24h.

### Validation rules (examples)

- **Tenant**
  - Required: `tenant_id`, `tenant_slug`, `crm_account_id` OR `billing_account_id`.
  - Formats: `tenant_slug` kebab-case; billing IDs match regex by provider.
  - Cross-check: at least one active product/plan assignment.
- **Org**
  - Required: `org_id`, `tenant_id`, `org_path` (hierarchy delimiter `/`).
  - Integrity: `parent_org_id` exists and shares same `tenant_id` (or null for root).
- **User**
  - Required: `user_id`, `tenant_id`, `primary_email` (RFC 5322); `primary_email` unique within tenant.
  - Consistency: `federated_subject_id` present for SSO users; `status` in reference code set.
- **Asset**
  - Required: `asset_id`, `asset_type`, `provider_resource_id`, `provider_account_id`.
  - Consistency: `asset_type` in controlled vocabulary; lifecycle state transitions allowed only per state machine.
- **Policy**
  - Required: `policy_id`, `policy_key`, `version`, `status` ∈ {draft, active, deprecated}.
  - Integrity: checksum of policy document stored; signature required for active policies.
- **Product/Plan**
  - Required: `product_id`, `sku`, `plan_code`, `version`, `currency`, `billing_term`.
  - Consistency: price list reference is valid and effective on activation date.

### Anomaly detection

- Drift detectors comparing SoR vs golden record deltas beyond tolerance (e.g., >3% daily change in active user count by tenant).
- Outlier detection on create/update velocity (e.g., sudden 5x spike in assets for a tenant triggers investigation).
- Sequence checks for status transitions (illegal `deprecated → active` changes flagged).
- Time-based staleness alerts when last successful ingestion exceeds SLA by entity type.

### Surfacing & triage

- Alerts: send to Ops/MDM Slack channel with entity, rule, severity, and remediation playbook link.
- Dashboards: data quality scorecards per entity (dimensions above) in BI tool; trendlines and backlog aging for dedupe and corrections.
- Tickets: auto-create Jira tickets for P1/P2 violations with owner routing (data steward per domain); attach evidence payload and SoR pointers.
- Runbooks: documented playbooks for each rule category; hotfixes logged as admin overrides with expiry and review.

## Reference data governance

### Taxonomies & code sets

- Regions (ISO-3166), industries (NAICS-like), risk levels (low/medium/high/critical), status codes (active/inactive/suspended), currencies (ISO-4217), policy types, asset types, product families.
- Maintain in **Reference Data Service (RDS)** with schemas: `code`, `display_name`, `description`, `effective_from`, `effective_to`, `status`, `source`, `version`, `parent_code` (for hierarchies).

### Change management & versioning

- Roles: **Data Steward** drafts changes; **Data Owner** approves; **MDM Council** reviews high-impact sets.
- Workflow: proposal → peer review → automated validation (uniqueness, hierarchy integrity, effective date windows) → approval → publish.
- Versioning: semantic versions per code set; immutable history; deprecations require successor mapping; publish change logs.
- Access controls: RBAC enforced in RDS; all changes signed and attributable.

### Distribution & caching

- RDS publishes signed artifacts (JSON + Parquet) to object storage and message bus topics (e.g., `refdata.<set>.v<semver>`).
- Services subscribe via SDK/sidecar with ETag + checksum validation; cache TTL defaults 1 hour with stale-while-revalidate.
- Bootstraps: on startup, services fetch latest approved version; fall back to cached snapshot if distribution unavailable (with warning).
- Client-side caches keep tenant-scoped subsets when applicable; purge/refresh triggered by `refdata.updated` events.

## Artifacts

### CompanyOS Data Quality & MDM v0 outline

1. Purpose & scope
2. MDM scope and models (entities, golden records, identity resolution)
3. Data quality controls (dimensions, validation, anomaly detection, surfacing)
4. Reference data governance (taxonomies, change management, distribution)
5. Operating model (roles, RACI, review cadences)
6. Metrics & SLAs (per dimension)
7. Playbooks (alert response, merge & unmerge, SoR escalation)
8. Audit & lineage (event schemas, provenance, signed changes)

### Example golden record logic

- **Tenant golden record**
  - Keys: `tenant_id`, `tenant_slug`.
  - Fields sourced by priority: `billing_account_id` (CRM → billing → admin override), `crm_account_id` (CRM → admin override), `primary_region` (admin override → onboarding form), `status` (billing system → CRM → manual), `plan_code` (catalog → billing), `created_at` (first SoR event), `updated_at` (latest authoritative update).
  - Conflict handling: if CRM and billing disagree on `billing_account_id`, prefer billing when record is <24h old; otherwise request steward review + ticket.
- **User golden record**
  - Keys: `user_id`, `primary_email`, (`tenant_id` scope).
  - Fields sourced by priority: `display_name` (IdP → CRM → admin override), `federated_subject_id` (IdP only), `employee_id` (HRIS → admin override), `phone_e164` (IdP verified phone → CRM), `role_assignments` (policy service), `status` (IdP → admin override with expiry), `mfa_enrolled` (IdP signals), `last_login_at` (authz gateway telemetry capped at 24h freshness), `created_at` (first SoR event), `updated_at` (latest authoritative update).
  - Conflict handling: if `primary_email` changes in IdP, create candidate match by `federated_subject_id`; do not auto-merge without steward review when similarity < 0.9.

### Checklist: "Data domain is MDM-governed if…"

- [ ] Master entities and attributes are cataloged with SoR and golden record rules.
- [ ] Deterministic keys and match rules are defined; probabilistic thresholds documented.
- [ ] Data quality rules cover completeness, consistency, timeliness, accuracy, uniqueness with SLAs.
- [ ] Reference data dependencies mapped to RDS code sets with versioning.
- [ ] Events emitted for merges, overrides, and quality violations with lineage IDs.
- [ ] Stewardship roles, approval workflows, and triage runbooks are assigned.
- [ ] Distribution mechanisms and caches are configured with validation (checksums/ETag) and rollback plans.
- [ ] Dashboards/alerts provide visibility; backlog of issues tracked with owners and due dates.
