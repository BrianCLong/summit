# Product Telemetry & Experiments Spec v0

## Purpose and scope

- Establish a unified telemetry, feedback, and experimentation backbone for CompanyOS that prioritizes measurable outcomes, privacy, and rapid learning loops.
- Applies to all product surfaces (web, mobile, services, APIs) and all tenants.

## Event taxonomy

- **Page/Screen Views**: navigation, impressions, load performance milestones.
- **Actions**: intentional user-initiated events (clicks, submissions, uploads, config changes, API calls). Actions must specify the **feature area** and **intent**.
- **Outcomes**: successful completion of workflows (e.g., resource created, task completed, policy saved, automation run finished), including quantitative outputs (duration, size, counts).
- **Errors/Alerts**: client or server errors, validation failures, policy/permission denials, timeouts, degraded experiences. Include user-visible severity and recoverability.
- **System Health**: background job status, queue depth, circuit breaker trips; aligned to SLO error budgets.

## Core event envelope

All events share a normalized envelope to simplify downstream joins and privacy enforcement:

- `event_id` (UUID v4), `event_name`, `event_type` (view|action|outcome|error|system_health).
- `timestamp` (ISO-8601 UTC), `source` (client|server|worker|api), `platform` (web|ios|android|cli|api), `app_version`.
- **Tenant & actor**: `tenant_id` (hash or pseudonym), `user_id` (stable hash), `user_role`, `session_id`, `auth_context` (sso|scim|passwordless|api_token), `is_internal`.
- **Feature context**: `feature_area` (enum), `workflow_name`, `surface` (component or endpoint), `experiment_assignments` (map of experiment_id → bucket), `request_id`/`trace_id`.
- **Device/geo (coarse only)**: `device_type` (desktop|mobile|tablet|server), `browser_family`, `os_family`, `country`, `region` (if allowed), `connection_type`.
- **Privacy flags**: `pii_classification` (none|low|medium|high) and `data_sensitivity` (public|internal|restricted) to drive routing/retention.

## PII minimization and aggregation rules

- Default to **pseudonymous identifiers** (hashed user_id/tenant_id) with rotation every 30 days; no raw emails, names, or IPs in events.
- Collect only coarse geolocation (country/region) and only when consented; never log exact coordinates.
- Payload fields must be enumerated allowlists per `event_name`; disallow arbitrary key/value blobs.
- Apply client-side redaction for free-text before emission; use pattern scrubbing for secrets/tokens.
- Server-side validation rejects events with disallowed fields; drop or tokenize IPs at edge.
- Retention tiers: 90 days raw, 12 months aggregated metrics; restricted data retained 30 days max.
- Access controls: role-based views with least privilege; audit logging for schema changes and data access.
- Aggregation defaults for dashboards: p50/p90 latencies, counts, conversion rates; no user-level drill-down without compliance approval.

## Feedback collection design

- **In-app widgets**: per-surface microfeedback (thumbs up/down + optional tags), contextual CSAT/NPS, and friction logging prompts triggered on drop-off.
- **Workflow-level flows**: end-of-flow surveys capturing outcome success, effort score, and blockers; pre-fill feature/workflow context.
- **Structured fields**: score (1–5), sentiment (positive/neutral/negative), tags (enum: usability, performance, policy, docs, support), component identifier, and blocking severity.
- **Unstructured comments**: optional free text with client-side PII scrub and profanity filter; limit to 500 chars.
- **Routing**: auto-create tickets in support system with enriched context (tenant, feature_area, recent errors, experiment bucket). Critical feedback (score ≤2) opens P1 triage with on-call rotation.
- **Storage & linkage**: feedback events share the same envelope and can reference preceding telemetry via `correlation_id` to join behavior with sentiment.

## Experimentation and rollout framework

- **Experiment types**: A/B/n, multivariate, interleaving (for ranking), and phased rollouts via feature flags.
- **Bucketing**: deterministic assignment on stable hashed `(tenant_id, user_id)` with namespace separation; support stratification (role, segment, region). Store bucket in `experiment_assignments` and emit on every relevant event.
- **Guardrails**: enforce SLOs (latency, error budget, availability), privacy constraints, and compliance segments (e.g., restricted tenants cannot be randomized without approval). Auto-kill switches if guardrail breaches persist >2 sampling intervals.
- **Metrics**: primary outcome metrics per hypothesis; secondary leading indicators; guardrail metrics (latency p95, error_rate, abandonment, support tickets). Define minimum detectable effect and sample size prior to launch.
- **Analysis patterns**: sequential testing with peeking-safe methods (e.g., SPRT or Bayesian), CUPED for variance reduction, non-parametric tests for skewed metrics, and diff-in-diff when phased rollouts are used.
- **Dashboards**: standard views for conversion funnels, retention, task completion time, error regression, and feedback sentiment split by bucket and segment. Include real-time guardrail tiles and data freshness indicators.
- **Rollout policy**: start at 5–10% canary → 25% → 50% → 100% upon guardrail health and effect confidence; restricted tenants require explicit allowlist.

## Governance and quality

- **Schema registry**: versioned schemas (JSON Schema) per `event_name` with lint checks in CI; breaking changes require migration plans.
- **Data contract checks**: CI validation for required fields, allowed enums, and PII classification; contract violations block merges.
- **Observability**: distributed tracing IDs propagate through events; sampling configurable by feature area. Ship metrics on event drop rates and client SDK health.
- **Documentation**: every feature PR must link to hypothesis, target metrics, and corresponding event schemas.

## Example event schemas — Workflow: Project creation and task assignment

- **project_viewed** (type: view)
  - Required: event envelope, `feature_area="projects"`, `workflow_name="project_creation"`, `surface="project_create_page"`.
  - Properties: `template_id` (optional), `prepopulated` (bool), `time_to_first_paint_ms`.
- **project_created** (type: outcome)
  - Properties: `project_id` (pseudonymous), `creation_path` (blank|template|import), `member_count`, `initial_tasks_count`, `duration_ms`, `validation_errors` (array of enums), `guardrail_status` (pass|fail|warning).
- **task_assigned** (type: action)
  - Properties: `task_id` (pseudonymous), `assignment_type` (direct|bulk|auto), `assignee_role`, `due_in_days`, `priority`, `assignment_latency_ms`.
- **project_creation_error** (type: error)
  - Properties: `stage` (load|validation|save|notification), `error_code` (enum), `http_status`, `recoverable` (bool), `retry_count`, `trace_id`.
- **project_feedback_submitted** (type: feedback/outcome)
  - Properties: `score` (1–5), `sentiment`, `tags` (array enum), `comment_present` (bool), `correlation_id` (links to recent events), `blocked` (bool), `blocker_type` (enum or null).

## Data flow and storage blueprint

- Client/SDK → Edge collector (PII scrubbing, sampling) → Streaming bus (e.g., Kafka) with topic partitioning by tenant → Real-time processors (enrichment, privacy classification) → Data lake/warehouse (raw + curated) → Metrics store and dashboards.
- Error handling: DLQs for malformed events; retry with exponential backoff; alert on sustained drop rates.
- Access patterns: curated marts for product analytics, experimentation, and support insights; joinable via `event_id`, `session_id`, and `correlation_id`.

## Innovation: Adaptive telemetry budgets

- Introduce **adaptive sampling and payload shaping** that prioritize high-risk segments (new releases, new tenants, elevated error rates) while throttling stable flows. Integrate with feature flags to adjust sampling dynamically per experiment phase.

## Success criteria

- Every major feature ships with defined hypothesis, event schemas, and feedback prompts.
- Dashboards live within 24 hours of launch with guardrails monitored; rollback switch wired to feature flag platform.
- <1% event rejection due to schema violations; <0.1% PII violations detected post-ingestion.
