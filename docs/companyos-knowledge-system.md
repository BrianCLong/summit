# CompanyOS Knowledge, Documentation, and Runbook System

## Purpose and North Star

- Make CompanyOS itself the operating manual: every action, decision, and fix is discoverable in one click from the place where work happens (alerts, dashboards, resource views, tickets, and graph nodes).
- Treat knowledge as first-class, versioned objects that map directly to systems, services, tenants, and features.
- Default to actionability: every runbook is executable, linkable, and keeps evidence for post-incident analysis.

## Knowledge Object Schema (outline)

- **Core fields (all types)**: `id` (ULID), `title`, `type` (doc | runbook | playbook | FAQ | ADR | incident-report), `status` (draft | in-review | approved | deprecated), `version` (semver), `change-log`, `owner` (team + primary on-call), `review-cadence` (e.g., 90d), `tags` (system, service, feature, tenant, severity, domain), `security-tier` (public | internal | confidential), `related-artifacts` (tickets, PRs, dashboards, alerts, code paths, feature flags), `linked-telemetry` (metrics queries, logs views, traces, SLOs), `attachments` (diagrams, JSON exports), `approvers`, `created_at`, `updated_at`.
- **Relationships**:
  - `systems` → top-level platform domains (e.g., Identity, Payments).
  - `services` → deployable units (e.g., `authz-gateway`, `graphai`), including `env` and `region`.
  - `features` → product capabilities (feature flag IDs, API surfaces).
  - `tenants` → customer/partner scopes with SLA/SLO labels.
  - `incidents` → incident IDs + timeline events; runbooks link back to prior incidents as precedents.
  - `dependencies` → upstream/downstream services; `data-contracts` and `SLIs` to align with reliability targets.
- **Versioning & approvals**:
  - Semver per knowledge object; breaking operational change = major, new path = minor, typo/clarity = patch.
  - Workflow: draft → in-review (peer + SRE reviewer) → approved (requires code owner) → auto-deprecate when superseded.
  - Required gates: ownership set, SLO/telemetry links present, rollback path defined (for runbooks/playbooks), evidence fields validated.
- **Change history**: stored as immutable log entries with author, summary, diff link, approval set, and automatic extraction of changed relationships (systems/services/tenants) for graph updates.

## Runbook & Incident Playbook Patterns

- **Levels**:
  - _Service-level runbooks_: scoped to a single service/component; contain commands/scripts with env-guardrails.
  - _Cross-system playbooks_: coordinate multiple services, data planes, and control planes; include RACI and communication tracks.
  - _Tenant-specific guides_: capture tenant overrides, feature-flag gates, data residency, and custom SLOs.
- **Required sections (ordered)**:
  1. Metadata block (title, service, env, severity class, last review, owners, approvers, version).
  2. Symptoms & triggers (exact alerts, dashboards, traces, and user-facing signals).
  3. Triage matrix (fast checks, customer impact, blast radius, correlated incidents).
  4. Diagnosis steps (deterministic checks first, then exploratory queries; commands with copy/paste blocks and safety notes).
  5. Action plan (fix steps with verification after each action; automated scripts preferred).
  6. Rollback/mitigation (feature flag toggles, traffic shifts, config reverts, data restores) with guardrails.
  7. Evidence to capture (logs, metrics screenshots, timelines, commands output, links to tickets/PRs) with storage location.
  8. Success criteria & exit checks (SLO restored, error budget trend, customer confirmation, alert silence window).
  9. Post-incident links (follow-ups, ADRs, and known gaps).
- **Alert/Dashboard linking**:
  - Embed runbook URLs in alert annotations and dashboard panels (Grafana/Datadog) using `runbook_url` labels.
  - From UIs (service graph nodes, on-call console, feature flag dashboards), surface contextual runbooks filtered by service+env+tenant.
  - Store runbook `shortcode` for CLI/ChatOps lookup (e.g., `/rb authz-latency-prod`).

## Authoring & Discovery UX

- **Authoring**:
  - Start from templates in `docs/templates/` via CLI (`companyos kb new runbook --service authz-gateway`) or web editor with structured fields.
  - Enforce metadata via lint (YAML front matter schema validation) and required sections via markdown lint rules.
  - Provide "propose from incident" flow that pre-fills timeline, signals, and commands from incident artifacts.
- **Discovery**:
  - Global search across title, tags, relationships, and telemetry references; filters for type, system, service, tenant, severity, freshness, reviewer, and approval status.
  - Contextual surfacing: from alert payloads, dashboard panels, service graph nodes, feature flags, and deployment UIs.
  - Similarity suggestions (vector search) for related incidents and runbooks; show top precedents.
- **Governance**:
  - Owners per object; auto-create review tasks based on `review-cadence` with Slack reminders.
  - Stale-doc detection: flag docs with missing owners, expired review dates, or unused links in alerts/dashboards.
  - Approvals logged; promote only after validation checks (schema, links, runnable commands marked with env constraints).

## Runbook Template (Markdown)

```markdown
---
id: <ulid>
title: <human-readable>
type: runbook
status: draft
version: 0.1.0
owners: [team:<team>, user:<primary-oncall>]
approvers: [<role or user>]
systems: [<system>]
services: [<service>@<env>/<region>]
features: [<feature-flag or capability>]
tenants: [<tenant>|all]
severity-class: Sev1|Sev2|Sev3
review-cadence: 90d
linked-telemetry:
  alerts: [<alert-name-or-id>]
  dashboards: [<dashboard-url>]
  slo: [<slo-id>]
related-artifacts: [<ticket>, <PR>, <ADR>]
shortcode: <cli-handle>
security-tier: internal
---

## Symptoms & Triggers

- Alerts firing: ...
- Customer signals/user impact: ...
- Time started / first seen: ...

## Triage Matrix

- Impacted tenants/regions:
- Blast radius estimate:
- Current mitigation (if any):
- Correlated incidents or deploys:

## Diagnosis Steps

1. ... (include command blocks and expected outputs)
2. ...

## Action Plan

- Step-by-step actions with verification after each action.
- Note automation scripts and feature flag toggles.

## Rollback / Mitigation

- How to revert changes or shift traffic; include safety checks.

## Evidence to Capture

- Logs/metrics screenshots, command outputs, timelines, ticket links; storage path.

## Success Criteria & Exit Checks

- SLO/SLI back to target, alert silence duration, customer confirmation.

## Follow-ups / Post-Incident Links

- ADRs, tech debt, monitoring gaps, backlog items.
```

## Example Runbook (Service-level) — AuthZ Gateway Latency Spike

- **Context**: AuthZ Gateway latency > P99 600ms in `prod-us` impacting login flows; alerts `authz_latency_high` and SLO burn > 2x.
- **Scope**: Service-level; tenant-agnostic; feature flags `authz-cache-prefill` and `authz-circuit-breaker` relevant.
- **Dependencies**: Upstream `identity-provider`, downstream `policy-engine`, cache cluster `redis-authz`.

### Metadata

- `id`: ulid:01JABCDE1AUTHZLATENCY
- `owners`: `team:platform-authz`, `user:oncall-primary`
- `approvers`: `sre-duty`, `arch-review`
- `services`: `authz-gateway@prod-us`
- `linked-telemetry`: alert `authz_latency_high`, dashboard `Grafana > AuthZ > Latency`, SLO `authz-p99-latency`

### Symptoms & Triggers

- Alerts: `authz_latency_high` firing 5m; SLO error budget burn rate 2.5x over 30m.
- User reports: login page delays and occasional timeouts.
- Dashboards: cache hit ratio dropped < 70%; elevated 5xx from `policy-engine`.

### Triage Matrix

- Impacted: all tenants in `prod-us`; risk of cascading auth failures.
- Blast radius: auth failure leads to API unavailability; prioritize mitigation within 10 minutes.
- Correlated events: config deploy at T-15m; Redis node resharding.

### Diagnosis Steps

1. **Confirm alert scope**
   ```bash
   kubectl -n authz exec deploy/authz-gateway -c app -- curl -s localhost:9090/metrics | rg 'authz_request_latency_seconds_bucket'
   ```
2. **Check cache health**
   ```bash
   redis-cli -h redis-authz.prod.us info | egrep 'role|connected_slaves|used_memory_human|evicted_keys'
   ```

   - Expected: role=master, minimal evictions; if memory pressure high, see mitigation.
3. **Inspect upstream/downstream**
   ```bash
   kubectl -n authz logs deploy/authz-gateway -c app --since=10m | rg 'policy-engine' | head -n 40
   ```

   - If downstream 5xx spikes, consider circuit breaker toggle.
4. **Check recent deploy/config**
   ```bash
   kubectl -n authz rollout history deploy/authz-gateway
   kubectl -n authz get configmap authz-gateway -o yaml | yq '.data'
   ```

### Action Plan

1. Enable circuit breaker to protect downstream:
   ```bash
   featurectl enable authz-circuit-breaker --env prod-us
   ```

   - Verify P99 recovers within 5 minutes.
2. Increase Redis cache memory and restart primaries if memory pressure observed:
   ```bash
   redis-cli -h redis-authz.prod.us config set maxmemory 6gb
   redis-cli -h redis-authz.prod.us save
   ```
3. If recent deploy correlates, rollback:
   ```bash
   kubectl -n authz rollout undo deploy/authz-gateway --to-revision=<previous>
   ```
4. Validate: dashboard P99 < 300ms for 10m; cache hit ratio > 90%; alerts cleared.

### Rollback / Mitigation

- If circuit breaker causing user impact, disable: `featurectl disable authz-circuit-breaker --env prod-us`.
- If Redis change regresses, revert `maxmemory` and restart replicas.
- Maintain traffic shift option: route 20% to `prod-eu` if global balancer allows.

### Evidence to Capture

- Screenshots of latency and cache hit ratio before/after.
- Command outputs (Redis info, rollout history) attached to incident ticket.
- Timeline entries with action timestamps in incident log.

### Success Criteria & Exit Checks

- P99 < 300ms for 10m, error budget burn < 1x, alerts silenced.
- No elevated login failures in analytics.
- Stakeholder update posted; incident channel archived with summary.

### Post-Incident Links

- Create ADR if circuit breaker needs permanent policy.
- Backlog: add auto-cache warmup for cold start; add synthetic test for cache saturation.

## Production-Ready Runbook Checklist

- Metadata complete (owners, approvers, service/env, severity class, version, review date set).
- Runbook linked in alert annotations, dashboards, and service graph node; shortcode registered for ChatOps/CLI.
- Required sections present; commands include env/tenant scope and safety notes; rollback path explicit.
- Telemetry links validated (alerts, dashboards, SLOs) and success criteria measurable.
- Evidence capture path defined; incident ticket and ADR references present.
- Peer + SRE approval recorded; review-cadence automation scheduled; lint passes schema/structure checks.
- Tested in staging or via game-day; lessons learned captured; known gaps listed.
