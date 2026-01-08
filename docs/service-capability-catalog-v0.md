# Service & Capability Catalog v0

## 1) Catalog data model

- **Entities**
  - **Service**: canonical unit of delivery (API, job, UI, or shared library). Track type (online, batch, library), lifecycle stage, maturity score.
  - **Capability**: user-facing or platform capability (e.g., Auth, Billing, Analytics) that maps to one or more services; owns user outcomes and roadmaps.
  - **Dependency**: directional relationship between services or capabilities with dependency mode (runtime, data, control-plane), criticality, and contract (sync/async, retry policy).
  - **Interface**: externally consumable surface (HTTP/gRPC/GraphQL/event/CLI) with version, OpenAPI/IDL link, auth mode, rate limits, and deprecation window.
  - **Owner group**: team or squad entry sourced from the Org Graph; includes on-call rotation links and escalation policy.
- **Required metadata (per service)**
  - Tier (0–3), tenants served, data classes processed/stored, regions, runtime profile (RPS, P99, utilization bands), SLOs and current SLI attainment, error budget burn.
  - Compliance & safety: data retention, PII/PCI/HIPAA flags, SBOM link, threat model, privacy review, security contact.
  - Operability: runbooks, standard ops playbook, dashboards, alerts, incident channel, feature flags, rollout strategy, deployment cadence, last deploy, DORA metrics.
  - Reliability: DR tier, RTO/RPO, active-active or warm-standby, chaos coverage, load test coverage, known failure modes.
  - Product context: primary capability mapping, key user journeys, contracts/SLAs with tenants, version lifecycle (active/deprecated/EOL).
- **Required metadata (per capability)**
  - Outcomes & KPIs, constituent services, dependency graph, roadmap link, UX entry points, availability/support hours, maturity level.
- **Graph relationships**
  - **Intelligence Fabric**: every entity becomes a node; edges capture `depends_on`, `implements`, `owned_by`, `exposes_interface`, and `serves_tenant`. Enables blast-radius, lineage, and “what uses this?” queries.
  - **Org Graph**: owner group references canonical team IDs; pulls roster, on-call rotation, and Slack/Teams channels. Ownership changes sync automatically via Org Graph events.

## 2) Ownership & accountability patterns

- **Assignment**
  - Each service must have: **Primary owner** (team), **Backup owner** (peer team), **Escalation policy** (pager schedule + duty manager). Individuals are derived from on-call rotations, not hard-coded.
  - Ownership is displayed inline on every service page and in search results; surfaces on-call now, upcoming, and last escalated responder.
- **Accountability flows**
  - Service SLOs roll up to owner groups by weighted criticality; error budget burn decrements the team budget and gates deploys when exhausted.
  - Incidents are linked to services and owners; postmortems auto-attach to the catalog entry. Repeated incidents on the same service trigger an ownership review.
  - Deployment freezes inherit from capability-level or tenant-level policies; overrides require approval from the owner’s duty manager.
- **Orphan handling & changes**
  - Catalog continuously checks for services without valid owners (no primary or stale >30 days): mark **Orphaned**, raise P1 to platform operations, and quarantine risky interfaces (read-only mode or tightened rate limits).
  - Ownership change workflow: submit change request → auto-validate new owner group + on-call schedule → update Org Graph link → notify tenants and dependent service owners.
  - Sunset path: if service is deprecated >90 days without successor mapping, escalate to architecture review to force replacement or decommission plan.

## 3) Capabilities map UX

- **Map navigation**
  - Landing page lists capabilities with health (SLO attainment, open incidents), maturity, and coverage score (tenants served vs. planned).
  - Selecting a capability shows constituent services, their runtime tiers, current status (SLO/alerts), and owning teams.
- **Visualizations**
  - **Dependency graph**: interactive, with edge coloring for criticality and overlays for latency/error signals; supports blast-radius mode (“what breaks if X fails?”) and tenant filter.
  - **Lifecycle view**: active/deprecated/EOL badges; rollout phases for new versions.
  - **Topology lenses**: by region, data class, interface type, or tenant; heatmap for error budget burn and incident density.
- **Search & filters**
  - Global search by service/capability/tenant/owner. Facets: tier, data class, interface type, region, lifecycle, incident state, deploy recency, and compliance flags.
  - Quick actions: open runbook, view dashboard, launch tracing session, request ownership change, subscribe to change events.

## 4) Artifacts

- **Service & Capability Catalog v0 outline**
  - Purpose, scope, definitions
  - Data model and required metadata
  - Governance (ownership rules, change management, orphan handling)
  - Ingestion & freshness (sync sources: repo manifests, Org Graph, monitoring, incident system)
  - UX flows (search, browse, visualization, change requests)
  - Rollout plan (MVP → adoption → enforcement), success metrics, and audit hooks
- **Example service entry template**
  - Identity: name, description, lifecycle stage, tier, primary capability, tenants served, regions
  - Ownership: primary team (Org Graph link), backup team, escalation policy, on-call rotation link, incident channel
  - Interfaces: list with type, endpoint, version, auth, quotas, deprecation window, contracts (OpenAPI/GraphQL/Proto/Event schema)
  - Dependencies: upstreams with mode/criticality, downstreams with consumer contracts, data stores, external vendors
  - Reliability: SLOs/SLIs, current attainment, error budget, alerts/dashboards, DR tier, RTO/RPO, chaos/load test coverage
  - Operability: runbooks/playbooks, deployment pipeline link, release cadence, feature flags, rollback plan, last deployment, DORA metrics
  - Compliance & safety: data classes, retention, encryption, privacy review, SBOM, threat model, security contact
  - Observability: logs/traces/metrics endpoints, sampling, ownership of telemetry pipelines
  - Change history: recent incidents, postmortems, ownership changes, roadmap items
- **Catalog-ready checklist**
  - Service has primary & backup owner, escalation policy, and live on-call link
  - All required metadata fields populated and validated; SLOs with current SLI data and error budget
  - Interfaces documented with versioned contracts; deprecation/EOL dates set where applicable
  - Dependencies declared with criticality and runbook coverage; dashboards and alerts linked
  - Tenants served, data classes, and compliance flags confirmed; DR tier, RTO/RPO documented
  - Postmortems linked for recent incidents; change history shows last deployment and ownership update
