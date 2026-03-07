# CompanyOS Internal CLI Spec v0

## Purpose and principles

- Provide a single, scriptable entrypoint for SREs, operators, and automation agents to inspect, change, and recover CompanyOS systems with guardrails.
- Safety-first defaults (read-only by default, dry-runs for mutating actions, and explicit approvals for impact).
- Human + machine friendly: consistent UX for humans, stable JSON for automation, and predictable exit codes.

## Command surface

### Core verbs

- **inspect**: fetch current state snapshots (service status, pod health, recent events).
- **list**: enumerate resources with filters (`--tenant`, `--service`, `--severity`, `--label`).
- **describe**: deep dive into a single target, including topology, owners, SLOs, and recent changes.
- **tail**: stream logs/events/alerts with server-side sampling and backpressure.
- **diff**: compare desired vs. live state (configs, policies, deployment manifests, feature flags).
- **run**: execute playbooks and automations with preflight checks and impact preview.
- **rollback**: revert to a known good revision (config, deployment, policy) with automatic blast-radius detection.
- **approve**: grant time-bounded permission for queued `run`/`rollback` actions.

### Targets and resource model

- **services** (runtime units: api, worker, cron) with environments (`--env prod|stg|dev`).
- **deployments** (release artifacts + rollout strategy + health gates).
- **incidents** (declared events with severity, commander, timeline, linked actions).
- **tenants** (customer or business-unit scoped configuration bundles and data planes).
- **configs** (application configs, feature flags, secrets references) with revision history.
- **policies** (guardrails, RBAC, rate limits, data residency controls) versioned and signed.
- Namespacing: `<org>/<tenant>/<service>/<environment>`; every command accepts `--context` to pre-fill scope.

### Authz model

- Identities: `human`, `automation` (CI/CD, bots), `break-glass` (time-bound emergency).
- Auth methods: OIDC device flow for humans, workload identity for bots, hardware-backed emergency tokens.
- Authorization:
  - Role + scope based: `viewer`, `operator`, `approver`, `admin`; scopes match namespace prefixes.
  - Sensitive verbs (`run`, `rollback`, `approve`) require dual controls: `--ticket` and, when high impact, a second `approve` actor.
  - Policy enforced via centralized PDP; CLI receives signed decision bundle and caches short-lived capability tokens.
- Audit: every command logs to the event bus with actor, scope, inputs, and resulting changeset ID.

## CLI ergonomics

- **Global flags**: `--context`, `--env`, `--tenant`, `--service`, `--format (human|json)`, `--output file`, `--page-size`, `--since`, `--until`, `--no-pager`.
- **Defaults**: read-only verbs default to human output; mutating verbs require `--yes` or interactive confirmation.
- **Dry-runs**: `--dry-run` supported for `run`, `rollback`, `approve`; returns impact summary with change graph.
- **Impact preview**: `inspect` and `diff` render blast-radius (affected tenants/services, SLOs at risk) before action.
- **Consistency**: stable field names, deterministic JSON ordering, and `--quiet` for scripting.
- **Paging**: auto-pager unless `--no-pager` or piped; supports `LESS`-style navigation and search.
- **Runbook integration**: `--show-runbook` attaches relevant KB articles; `--open-runbook` can launch the page in the browser/editor.
- **Knowledge system**: `--explain` annotates commands with reasoning steps and links to past incidents affecting the same scope.

## Automation and bots

- **Playbook library**: common flows compiled into single commands (`run playbook/\<name>`). Examples:
  - `playbook/restart-service` (cordon, drain, canary, verify, uncordon).
  - `playbook/config-rollout` (diff, staged rollout with metrics guard, auto-rollback on regressions).
  - `playbook/cache-warm` (preload, heat check, promote).
- **Chat-ops**: bot exposes the same verbs with guardrails: requires `#incident-<id>` or `#ops-approved` channel, links commands to message URLs, and requests approvals inline with buttons.
- **Guardrails**:
  - Rate limits per identity and scope; exponential backoff for repeated failures.
  - Forced `--dry-run` for high-severity incidents until an approver unlocks.
  - Red/blacklist filters: never allow production-wide wildcard without explicit `--all-tenants` and a second approval.
  - Full command/response transcript stored in audit log and attached to incident timeline.

## Example commands

### Incident response

- `coctl list incidents --severity=critical --since=1h --format=human`
- `coctl describe incident INC-2451 --show-runbook --format=human`
- `coctl tail services --service payments-api --env prod --since=15m --context org/tenantA --no-pager`
- `coctl diff deployments payments-api --env prod --ticket INC-2451`
- `coctl run playbook/restart-service --service payments-api --env prod --dry-run --ticket INC-2451`
- `coctl approve --action-id abc123 --comment "approved by incident commander" --ticket INC-2451`
- `coctl rollback deployments payments-api --env prod --to-revision 2024-10-12T08:15Z --yes --ticket INC-2451`

### Tenant debugging

- `coctl describe tenant tenantA --include=quotas,features,policies --format=json`
- `coctl inspect services --tenant tenantA --service search --env prod --format=human`
- `coctl diff configs --tenant tenantA --service search --env prod --revision current --with-secrets=stubs`
- `coctl tail incidents --tenant tenantA --since=2h --format=human`
- `coctl run playbook/cache-warm --tenant tenantA --service search --env prod --dry-run`

## Safety and approval workflow

- All mutating verbs emit an **impact statement** (affected tenants, SLOs, and dependencies) before executing.
- Approval tokens are short-lived and bound to the exact command digest; replays are rejected.
- `--ticket` is required for prod mutations; ticket metadata is embedded in the audit event and rollback notes.
- `rollback` automatically captures pre-state snapshots and publishes a post-rollback health report.

## Checklist: a new CLI command is safe and useful if…

- [ ] It supports `--dry-run`, `--format`, `--context`, and `--yes/--no-prompt` appropriately.
- [ ] It emits impact preview with explicit scope (tenant, service, env) and rejects wildcards without confirmation.
- [ ] It logs to the audit bus with actor, scope, inputs, and resulting change IDs.
- [ ] It surfaces relevant runbooks/KB links via `--show-runbook`.
- [ ] It returns deterministic JSON (field order and types) and meaningful exit codes.
- [ ] It enforces authz scopes and dual control where required (`run`/`rollback`/`approve`).
- [ ] It integrates with chat-ops (command digest + response) and supports non-interactive automation.
- [ ] It documents failure modes and rollback/abort steps in `--help`.
