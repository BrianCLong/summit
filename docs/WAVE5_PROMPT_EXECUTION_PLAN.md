# Wave 5 Execution Plan: Prompts 33–40

This plan turns prompts 33–40 into actionable engineering tracks with clear API shapes, data models, and test gates so teams can work in parallel without collisions.

## 33. Human-in-the-Loop Review & Decision Console Backend (hil/)
- **Scope & Decisions Covered:** ER overrides, export approvals, governance/policy overrides, high-risk copilot answers, and privacy escalations are reviewable via task types with required roles and dual-control flags.
- **Task Model:**
  - Fields: `task_id`, `task_type`, `priority`, `required_roles`, `requires_dual_control`, `sla_hours`, `status` (`open|in_progress|completed|rejected|expired`), `assignees` (array of user IDs with role), `context_refs` (ER/gov/case/privacy IDs only), `created_at`, `due_at` (computed from SLA), `audit_log` entries.
  - Lifecycle rules: only `open → in_progress → {completed,rejected,expired}`; `expired` auto-triggers after SLA; dual-control demands two distinct approvers with required role mix.
- **APIs:**
  - `POST /hil/tasks`: idempotent on `(external_ref, task_type)`; accepts context refs and rich metadata (no raw PII).
  - `GET /hil/tasks`: filters by `user`, `role`, `case_id`, `status`, `task_type`, `overdue=true`.
  - `POST /hil/tasks/{id}/claim`: manual claim with role validation; auto-assignment runs a role/priority-based queue.
  - `POST /hil/tasks/{id}/complete`: payload includes `decision` (`approved|denied|amended`), `comment`, `attachment_ids`, `next_steps`.
- **Example JSON Flows:**
  - **ER Review:** `task_type="er_decision"`, `context_refs={"er_decision_id":"er-789"}` → completion `{decision:"approved",comment:"risk model acceptable"}`.
  - **Export Approval:** `task_type="export_approval"`, `context_refs={"export_case_id":"exp-456"}` → completion `{decision:"approved",attachment_ids:["legal-op-12"],comment:"dual-use cleared"}`.
  - **Policy Override:** `task_type="policy_override"`, `context_refs={"policy_eval_id":"pdp-321"}` with `requires_dual_control=true` → completion requires two distinct approvers.
- **Testing:** unit tests for lifecycle transitions, SLA expiry, dual-control enforcement; integration tests simulating upstream task creation and decision consumption; idempotency tests for duplicate create/complete calls.

## 34. Data Catalog & Schema Registry (data-catalog/)
- **Models:**
  - Dataset: `dataset_id`, `name`, `owner`, `steward`, `description`, `sensitivity`, `tags`, `purpose`, `lineage_refs`, `retention`, `license`, `quality_score`.
  - Schema: `schema_id`, `dataset_id`, `version`, `compatibility` (`backward`, `forward`, `full`, `none`), `fields`, `canonical_model_refs`, `created_by`, `created_at`.
- **APIs:** register/update datasets and schemas (CI/ingest hooks allowed), search/browse by `tags`, `owner`, `sensitivity`, `purpose`, and query schema versions + compatibility guidance.
- **Tests:** schema versioning and compatibility rules; search filter accuracy on sample catalog; integration tests where ingest/CI hooks auto-register artifacts.

## 35. Feature Store & Training Pipeline (ml/feature-store, ml/training-pipeline)
- **Feature Store:**
  - Feature definition: `name`, `entity_key`, `ttl`, `data_source`, `transformation`, `effective_time`, `metadata` (owner, sensitivity), `version`.
  - Access: read-only online store (low-latency lookups), offline bulk exports with point-in-time correctness and backfill jobs; time-travel lookups enforce no label leakage.
- **Training Pipeline Templates:**
  - Config-driven selection of features/labels/date ranges; splits with leakage safeguards; packaging of artifacts with metadata (feature set, data interval, metrics, model version, checksum).
  - Hooks to a model registry stub for publish/promote events.
- **Tests:** deterministic feature computation, time-travel guards, synthetic training runs with small datasets and baseline models.

## 36. Access Provisioning & Role Profiles (access-admin/)
- **Models:** role profiles (analyst, supervisor, auditor, admin, red-team) stored as data with permissions/attributes; user/team/group assignments with tenant info; change requests reference HITL for approvals.
- **APIs:** provision users with default roles/tenants, change roles with justification + optional HITL hook, export current access state for audit; translate roles → PDP-ready claims attributes.
- **Tests:** role resolution correctness, fail-closed on missing roles, audit log coverage on all mutations.

## 37. Scenario Simulator & Synthetic Incident Generator (sim-engine/)
- **Scenario Templates:** fraud ring growth, supply-chain shock, coordinated disinformation; each defines entities, event cadence, knobs (seed, rate, duration), and tagging (`scenario_id`, `run_id`, tenant/namespace isolation).
- **Orchestration:** start/stop/rewind with speed controls; feeds synthetic events into existing ingest/event APIs only; collects downstream outputs (alerts, anomalies, cases, governance results, copilot answers).
- **Tests:** determinism via seed, throughput stress with adjustable rate, isolation to prevent leakage into production tenants.

## 38. Explanation Quality Feedback & Analyst Rating Loop (xai-feedback/)
- **Schema:** feedback objects with `artifact_type`, `artifact_id`, `model/prompt/version`, `rater_id`, `case_id`, `dimensions` (usefulness, clarity, correctness, risk, follow_up), `created_at`, `notes`, `attachment_ids`.
- **APIs:** submit feedback (dedupe on analyst + artifact + short window), query aggregates by model/prompt/version or pattern/use-case, emit signals (e.g., noisy patterns, retrain priorities).
- **Tests:** deduplication, privacy guardrails (reject raw PII fields), aggregation accuracy and windowing logic.

## 39. Accessibility & Inclusive Design Infrastructure (a11y/)
- **Primitives:** focus traps, skip-links, ARIA wrappers, screen-reader-only text, keyboard navigable menus, contrast tokens/theming.
- **Automation:** CI harness running axe-like scans and keyboard navigation checks on key flows (tri-pane explorer, case/report); assistive API contract for “summarize this view” hooks to copilot/XAI.
- **Tests:** component-level accessibility specs, CI scan job for selected routes, keyboard-only navigation regression tests.

## 40. Architecture Conformance Bot & Code Quality Guardrails (arch-bot/)
- **Rules-as-code:** dependency map for allowed imports between layers (`apps/web` → `server/*` OK, no direct `ml/*` internals; `extensions/` limited to approved APIs; generated-code exclusions configurable).
- **Checks:** forbidden import scan, direct DB access violations, style/lint/coverage thresholds per module; report-only mode first, then enforce.
- **Tests:** known-good/known-bad fixture repos, performance tests on large diffs, safety tests to avoid false positives; CI integration to comment/fail with remediation guidance.

## Integration & Sequencing
- **Dependencies:**
  - `access-admin` integrates with HITL for approval flows and PDP for claims; HITL decisions feed back to upstream ER/governance/export systems only by IDs.
  - `sim-engine` reuses ingest/event APIs and tags data for catalog lineage; outputs can be rated through `xai-feedback`.
  - `data-catalog` receives hooks from ingest/CI and references schemas used by `feature-store` and `sim-engine` outputs.
  - `arch-bot` guards all new modules with rules + lint/coverage gates; `a11y` automation runs in CI alongside arch checks.
- **Test Gates:** unit and integration suites per module, idempotency tests for HITL/xai-feedback, determinism/isolation tests for sim-engine, compatibility/search tests for data-catalog, leakage/time-travel tests for feature store, and CI accessibility/arch-bot checks.

## Deliverables for Teams
- Publish API specs per module under their directories (`hil/`, `data-catalog/`, etc.).
- Provide seed fixture sets for tests (task lifecycle, catalog search, feature time-travel, scenario determinism, feedback dedupe).
- Ship example JSON payloads (above) plus CLI curl snippets for admins to validate flows end-to-end.
