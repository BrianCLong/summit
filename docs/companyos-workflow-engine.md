# CompanyOS Workflow & Approvals Engine (Node + Postgres)

## Purpose & Tenets

- **Deterministic + auditable**: Every state transition is append-only, signed by actor identity, and replayable from the event log.
- **Flexible without schema rewrites**: Templates and conditions are stored as JSONB + reference tables; runtime configuration lives in `workflow_definitions` and `step_definitions` rows rather than altering columns.
- **Idempotent + safe retries**: All mutating APIs accept `Idempotency-Key` and enforce monotonic sequence numbers per workflow instance.
- **Separation of definition vs. execution**: Immutable definitions, versioned instances bound to a specific definition version.

## Data & Workflow Model

### Core tables (Postgres)

- `workflow_definitions` (`id`, `name`, `version`, `description`, `metadata jsonb`, `created_by`, `created_at`, `is_active`).
- `step_definitions` (`id`, `workflow_definition_id`, `key`, `type`, `approval_mode`, `assignment jsonb`, `conditions jsonb`, `sla jsonb`, `actions jsonb`, `transition_map jsonb`, `position graph geometry` for ordering/graph layout, `ui_hints jsonb`).
- `workflow_instances` (`id`, `definition_id`, `definition_version`, `state`, `payload jsonb`, `context jsonb`, `started_by`, `started_at`, `completed_at`, `cancelled_at`, `lock_version` for optimistic concurrency).
- `step_instances` (`id`, `workflow_instance_id`, `step_definition_id`, `state`, `assignees jsonb`, `due_at`, `started_at`, `completed_at`, `data jsonb`, `attempt_counter`, `lock_version`).
- `transitions` (`id`, `workflow_instance_id`, `from_step_instance_id`, `to_step_instance_id`, `event`, `condition_snapshot jsonb`, `actor`, `actor_type`, `action_payload jsonb`, `occurred_at`, `idempotency_key`, `sequence_number`).
- `approvals` (`id`, `step_instance_id`, `actor`, `actor_type`, `status`, `delegated_to`, `quorum_weight`, `comment`, `occurred_at`).
- `automation_runs` (`id`, `workflow_instance_id`, `trigger`, `action`, `target`, `payload jsonb`, `status`, `last_error`, `attempts`, `idempotency_key`, `created_at`).
- `audit_log` (`id`, `entity_type`, `entity_id`, `event`, `actor`, `metadata jsonb`, `occurred_at`).

**Extensibility hooks**: JSONB columns (`metadata`, `context`, `conditions`, `actions`) allow new rule types and payloads without schema changes. Versioned definitions keep history intact.

### Definitions

- **Workflow Definition**: Named, versioned DAG of steps with transitions and default SLA/automation rules.
- **Step Definition**: Includes `type` (`approval`, `task`, `automated`, `wait`, `gateway`), `approval_mode`, assignments (users, groups, roles, dynamic via expression), conditions, SLA configuration, and transition map keyed by outcomes (e.g., `approved`, `rejected`, `timeout`, `error`).
- **Transition Definition**: Outcome -> target step key; optional guard expressions (JSONLogic or CEL) evaluated against instance `payload` and `context`.

### Instances

- **Workflow Instance**: Bound to specific definition version, maintains state (`running`, `completed`, `cancelled`, `errored`, `on_hold`). Holds business payload and runtime context.
- **Step Instance**: Materialized per execution with assignees resolved, due dates computed, and runtime data (attachments, comments, system outputs).

## Approval Primitives

- **Single approver**: first responder or designated owner; state completes on one `approved` decision.
- **Multi-approver AND**: requires all assignees (or all groups resolved) to approve; rejection from any can short-circuit if configured.
- **Multi-approver OR**: completes when any approver approves; rejection can either end the step or continue collecting per definition.
- **Quorum**: numeric or weighted (e.g., 3 of 5, or >=60% weight). Stored in `approval_mode` with `quorum_weight` target; each approval stores `quorum_weight` contribution.
- **Delegation**: assignee can delegate to another actor; captured in `approvals.delegated_to`, preserving original actor for audit.
- **Escalation approver**: SLA breach reassigns to escalation group with a new due date while preserving original trail.

## State Machine Design

### Workflow-level states

- `running` → `completed` | `cancelled` | `errored` | `on_hold` | `paused`.
- Invariant: `completed_at` only set when **all** terminal steps resolved.
- Invariant: `lock_version` increments on every state change (optimistic concurrency for idempotency).

### Step-level states

- `pending` → `active` → (`approved` | `rejected` | `skipped` | `expired` | `failed`).
- Gateways: `parallel_split`, `parallel_join` (AND), `inclusive_gateway` (OR), `exclusive_gateway` (XOR) for routing.
- Invariant: A step can transition from `active` to terminal once per unique `sequence_number`; retries must reuse same `idempotency_key`.

### Transition Table (excerpt)

| From State | Event                 | Condition               | To State            | Invariants                      |
| ---------- | --------------------- | ----------------------- | ------------------- | ------------------------------- |
| `pending`  | `step.activated`      | lock acquired           | `active`            | lock_version++ per activation   |
| `active`   | `approval.recorded`   | approval_mode satisfied | `approved`          | store approval summary snapshot |
| `active`   | `approval.recorded`   | rejection rule met      | `rejected`          | capture rejecting actor, reason |
| `active`   | `timer.expired`       | SLA timer fired         | `expired`           | enqueue escalation automation   |
| `approved` | `transition.dispatch` | guard true              | next step `pending` | append transition event         |
| `rejected` | `transition.dispatch` | guard true              | error/rollback step | rollback handler optional       |
| any        | `cancel.requested`    | admin only              | `cancelled`         | audit actor+reason              |
| any        | `on_hold.requested`   | compliance hold         | `on_hold`           | freeze timers, no SLA accrual   |

## SLA Features

- **Due date calculation**: `sla jsonb` supports relative durations (e.g., `2d` from activation), business calendar, and timezone.
- **Escalations**: timers enqueue `escalation` events → reassign step to escalation group, bump due date, notify.
- **Reminders**: recurring schedule (e.g., T-24h, T-1h) emitting notifications and webhook actions.
- **Reassignments**: manual or automated reassignment updates `assignees` while preserving audit trail.
- **SLA stop conditions**: hold/pause stops timers; resumed by admin or automation.

## Automation & Webhooks

- **Triggers**: `workflow.created`, `workflow.updated`, `step.activated`, `step.completed`, `sla.reminder`, `sla.breached`, `automation.failed`.
- **Actions**: notify (email/Slack/Teams), create task/ticket, invoke webhook (signed with HMAC + `idempotency-key`), publish event to Kafka/NATS, start child workflow.
- **Idempotency**: `automation_runs` keyed by (`trigger`, `action`, `idempotency_key`); reruns with same key no-op. Store last payload hash for replay protection.
- **Backoff + DLQ**: retry policy with exponential backoff; failures routed to DLQ table with re-drive endpoint.

## API (REST, Node/Express)

- `POST /api/workflows` – start workflow instance. Headers: `Idempotency-Key`. Body: `definition_id` or `slug`, `version`, `payload`, `initiator`. Response includes `instance_id`, `state`.
- `POST /api/workflows/:id/steps/:stepId/actions` – act on a step (`approve`, `reject`, `comment`, `delegate`, `reassign`). Headers: `Idempotency-Key` and `If-Match: <lock_version>` for concurrency.
- `POST /api/workflows/:id/cancel` – request cancellation with reason.
- `POST /api/workflows/:id/pause` / `resume` – pause/resume SLA timers.
- `GET /api/workflows/:id` – fetch instance with steps, history, audit events.
- `GET /api/workflows/:id/audit` – ordered audit trail.
- `GET /api/workflow-definitions` – list active definitions/versions.
- `POST /api/webhooks/workflow-events` – signed webhook receiver for chained automations.

## Idempotency & Safe Retries

- All mutating endpoints require `Idempotency-Key`; stored in `transitions`/`automation_runs` with `sequence_number`.
- Optimistic concurrency on instances/steps via `lock_version` (ETag via `If-Match`).
- Transition processor de-duplicates by (`instance_id`, `event`, `idempotency_key`).
- Webhooks include monotonic `event_id` and signature; replay detection via `event_id` table.

## Audit Trail

- Append-only `audit_log` capturing actor, source, IP/user-agent, diff of payload/context, and outcome.
- Every transition emits `audit_log` + `transitions` row; human-readable timeline available via `/audit`.
- Compliance mode: immutability enforced via PostgreSQL `INSERT-only` partition or external WORM storage (e.g., S3 Glacier with hash chain).

## Example Workflow 1: Policy Publish

1. **Create** instance with payload `{policy_id}`.
2. **Legal review (approval: AND)** – assignees: legal group; due in 2d; quorum = all. Escalate to GC after T+2d.
3. **Exec sign-off (approval: single)** – assignee: COO; due in 1d. Reminder at T+12h.
4. **Employee acknowledgment (task)** – auto-generate tasks for employees; requires >=95% acknowledgments (quorum). Webhook to LMS for completions.
5. Completion triggers webhook `policy.published` and audit closure.

## Example Workflow 2: Vendor Intake

1. **Create** instance with vendor metadata.
2. **Security review (approval: OR)** – security leads; rejection sends back to requester with reasons.
3. **Procurement approval (approval: quorum 2 of 3)** – escalation to finance lead on breach.
4. **Contract storage (automated)** – webhook to contract repository; on success mark step done; on failure retry/backoff then DLQ.
5. Emits `vendor.onboarded` event with link to contract location.

## Forward-Looking Enhancements (state-of-the-art)

- **Deterministic workflow runtime inspired by Temporal**: persisted workflow code as deterministic reducers, enabling replay and time-skipping without flakiness.
- **Policy-as-code guards**: CEL/OPA bundle evaluation per transition for standardized policy enforcement.
- **Graph analytics for bottlenecks**: periodically compute centrality/latency metrics across transition graph to auto-tune SLAs and assignee routing.
- **Immutable hash chain audit**: link `transitions` rows via SHA-256 to produce tamper-evident ledger; exportable to external SIEM.
