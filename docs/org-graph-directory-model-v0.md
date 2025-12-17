# Org Graph & Directory Model v0

## Purpose and scope
This document defines how CompanyOS understands customer organizations: the data model for people, teams, roles, and reporting lines; how we integrate with IdPs and HRIS sources; and how org context powers approvals, access controls, and notifications.

## Canonical entities
- **Person**: uniquely identified by `person_id` (stable UUID), primary email, and optional enterprise identifiers (employee ID, username, external IDs). Includes names, pronouns, manager, employment status, and work location.
- **Employment/Position**: time-bounded assignment of a person to a role within an org unit; tracks job code/title, FTE status, start/end dates, and whether it is primary or concurrent.
- **Role**: reusable capability definition (e.g., "SRE", "Data Steward") with permissions or policy bindings. A person holds roles via Positions or direct grants.
- **Team**: operational group with owner, purpose, and membership. Teams can be nested; ownership drives resource stewardship.
- **Department/Org Unit**: hierarchical business structure (division → department → cost center). May differ from Team hierarchy; carries finance/compliance metadata.
- **Project/Initiative**: temporary cross-functional grouping with members, sponsor, and expected end date.

## Relationships
- **manages**: `Person -> Person` (primary manager) with validity window; supports historical snapshots.
- **belongs_to**: `Person/Position -> Team` and `Team -> Org Unit` (hierarchical). Each link is time-bounded to support reorganizations.
- **dotted_line**: secondary reporting (mentor, functional lead) with weight/priority and effective dates.
- **project_membership**: `Person -> Project` with role (e.g., owner, contributor) and allocation (% time).
- **role_assignment**: `Person/Position -> Role` with source (HRIS, manual, policy) and expiration.

## Temporal modeling
- All entities carry `valid_from`, `valid_to`, and `source` metadata; records are immutable snapshots (bitemporal: transaction + effective time where supported).
- Current state is derived by querying records with `valid_from <= now < valid_to` (or open-ended `NULL`).
- Upstream changes (rehire, back-dated manager change) create new versions; we never mutate history.
- Source precedence is encoded per attribute (e.g., HRIS beats IdP for legal name; IdP beats HRIS for primary email) to resolve conflicts when merging timelines.

## Integration patterns
### Connectors
- **IdPs (SCIM)**: ingest Users and Groups; map SCIM `externalId` and `id` to `person_id` aliases; track group hierarchy for teams; capture active/deprovisioned states.
- **IdPs (SAML/OIDC)**: consume assertions/claims to enrich identities (e.g., department, manager email); useful for just-in-time (JIT) provisioning into the graph cache.
- **HRIS APIs**: pull employees, job info, positions, org units, and manager chains. Common systems: Workday, BambooHR, Gusto, ADP. Prefer delta endpoints/webhooks when available.
- **Flat files/SFTP**: scheduled CSV feeds for long-tail HRIS; validated via schema and checksum before ingest.

### Sync strategies
- **Full sync**: periodic (e.g., nightly) canonical rebuild to reconcile drifts; replays all entities and relationships, closing gaps with `valid_to` when absent upstream.
- **Incremental sync**: event/webhook or timestamp-based deltas for new/changed employees, terminations, manager updates, and org unit moves.
- **Conflict resolution**:
  - Attribute-level priority per source; retain all versions with provenance.
  - When identifiers collide (email reuse), preserve history by generating new `person_id` and linking via `previous_person_id`.
  - Soft-deletes: upstream deprovision closes `valid_to`; manual resurrection creates new version with `source=manual`.
- **Data quality protections**:
  - Schema validation + required fields gating (unique identifier, status, timestamps).
  - Fuzzy matching for duplicates (name + hire date + manager) flagged for review, not auto-merged.
  - Quarantine inconsistent records (e.g., manager not found) and emit alerts.

### Handling incomplete data
- Backfill managers via email matching across IdP/HRIS.
- Infer team membership from cost center or group path when explicit team missing.
- Support provisional placeholders ("Unmapped Manager") with monitoring until resolved.
- Allow per-tenant mapping rules: attribute transforms, enumerations (employmentType), and default timezones/offices.

## Usage in CompanyOS
- **Approvals**: route to primary manager, functional lead (dotted-line), or role owner; escalate along org-unit hierarchy if no response.
- **Access Reviews**: certify entitlements by team/role; auto-scope campaigns to active positions within a period; terminate access when `valid_to` lapses or employment ends.
- **Notifications & ownership**: surface owners for services/incidents/tenants from Team → Owner → Person chain; show alternates when on leave (per calendar/HRIS status).
- **Search & context**: UI panels display reporting chain, peers, team charter, and project memberships. Ownership chips appear on resources with avatars and hover cards.
- **Privacy & visibility**:
  - Default: employees see their chain (manager ±2 levels), team info, and project memberships; broader browsing requires RBAC flag.
  - Sensitive attributes (comp bands, performance flags) stored but redacted unless viewer has clearance; audit log access.
  - Support regional data residency tags and subject access requests; deletions generate tombstones without removing historical aggregates.

## Example HRIS → CompanyOS sync pipeline
1. **Ingest**: Fetch HRIS delta feed (employees, positions, org units, managers). Validate schema; store raw payload with checksum and source timestamp.
2. **Normalize**: Map fields to canonical schema:
   - `workerId` → `person_id` alias; `workerEmail` → primary email; `status` → employment state.
   - `jobCode/title` → Role reference; `positionId` → Position; `supervisorId` → manager link.
   - `orgCode`/`costCenter` → Org Unit; `departmentName` → Team display name.
3. **Enrich**: Merge IdP groups for team membership; backfill missing managers via email; apply mapping rules (timezone, office).
4. **Temporalize**: Create/close versions with `valid_from/valid_to`; ensure transaction time is recorded at ingestion.
5. **Publish**: Upsert into Graph store; emit events (`person.updated`, `team.changed`, `manager.changed`) for downstream services.
6. **Verify**: Run invariants (acyclic manager graph, no orphaned teams, single primary position per person) and alert on violations.

### Sample field mapping
| HRIS field | CompanyOS target | Notes |
| --- | --- | --- |
| `workerId` | `person.aliases.worker_id` | Stable; used for dedupe. |
| `userPrincipalName`/`email` | `person.primary_email` | Prefer corporate email; fallback to personal if flagged. |
| `givenName`, `familyName` | `person.name` | Stored with locale. |
| `supervisorId` | `manages` relationship | Becomes `manager_person_id`; time-bounded. |
| `jobCode`/`jobTitle` | `role.code`, `position.title` | Roles reusable across positions. |
| `positionId` | `position.id` | Drives employment intervals. |
| `costCenter` | `org_unit.code` | Attach finance metadata. |
| `department` | `team.display_name` | If multiple departments, create nested org units. |
| `employmentType` | `position.employment_type` | Full-time, contractor, intern, etc. |
| `workLocation` | `person.work_location` | Normalize to country/region/site. |

## Integration safety checklist
- Incoming feeds validated (schema + checksum) and stored raw for replay.
- Every record carries `source`, `captured_at`, `valid_from`, `valid_to` metadata.
- Identifier strategy defined: primary UUID plus source aliases; email reuse handled via new person versions.
- Manager graph is acyclic; dangling references quarantined.
- Only one active primary position per person; employment status governs access lifecycle.
- Attribute-level source precedence documented and enforced.
- Quarantine + alerting for missing critical fields (email, status, manager) or suspicious churn spikes.
- Backfills and manual overrides audited with actor and reason.
- Dry-run mode for new connectors; production syncs gated behind feature flags with metrics.
- Data residency and privacy policies applied per tenant; sensitive fields encrypted and access-logged.
- Downstream consumers subscribe to `person/team/role` change events with idempotent handlers.
