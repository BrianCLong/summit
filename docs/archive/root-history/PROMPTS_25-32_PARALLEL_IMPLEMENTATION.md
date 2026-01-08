# Prompts #25–#32: Parallel Delivery Blueprint

This blueprint decomposes prompts #25–#32 into parallelizable work packets with explicit APIs, data models, validation gates, and rollout guardrails. Each prompt is self-contained to minimize merge contention and is shaped for deterministic testing.

## Global execution rules

- Branch per prompt; flags default **off** where applicable.
- Deterministic fixtures for validation/audit. Avoid shared mutable schemas; prefer versioned contracts per prompt.
- Observability: emit per-feature metrics, trace IDs, and audit logs for state changes and reversals.

## 25) Case Templates + Field-Level Schema Registry (versioned)

- **Goal:** Expose `POST /case-templates`, `GET /case-templates/:id`, and enforce template version pinning for `POST /cases`.
- **Architecture:**
  - Template store with `{templateId, version, jsonSchema, owner, permissions}` and status (`active`, `deprecated`).
  - Field-level schema registry supporting additive versions; migration metadata (`fromVersion`, `changeset`, `migrationGuide`).
  - Validation layer using JSON Schema; deterministic error codes (`TEMPLATE_NOT_FOUND`, `VERSION_MISMATCH`, `SCHEMA_VIOLATION`).
- **Permissions:** RBAC/ABAC on template CRUD; case creation checks read access to template + version.
- **Versioning:** Cases persist `{templateId, templateVersion}`; upgrades require migration intent (`targetVersion`) and dry-run validation.
- **Tests:**
  - Invalid payload rejected with stable errors.
  - Template version pinning honored; mismatched version blocked.
  - Migration simulation: sample template v1→v2 with field rename/additive optional passes via migration hook.
- **Rollout:** Backfill existing cases with default version map; OpenAPI/GraphQL schema updated with template references.

## 26) “Evidence-to-Entity” Auto-Linker (rules + confidence) with Safe Undo

- **Goal:** Background job proposes evidence↔entity edges with confidence + rationale; never auto-applies without explicit flag.
- **Architecture:**
  - Rule engine consuming evidence metadata (hash, filename patterns, extracted entities, source classifier).
  - Suggestion store: `{suggestionId, evidenceId, entityId, ruleId, confidence, rationale, createdBy=job}` plus `undoToken`.
  - Audit + provenance hooks for suggestion creation and undo.
- **Safety:**
  - Suggestions reversible: undo removes only auto-generated edges and logs provenance (`undo-requested-by`).
  - Threshold flag `AUTO_APPLY_ENABLED=false` by default; even above threshold requires flag + audit note.
- **Tests:**
  - Fixture evidence produces expected suggestions/confidences.
  - Undo removes generated edges only; manual edges unaffected.
- **Interfaces:** `POST /evidence-linker/run` (optional dry-run) and `GET /evidence-linker/suggestions?entityId=`.

## 27) Collaboration: Optimistic Locking + Conflict Resolution for Edits

- **Goal:** Prevent silent overwrites for entities/notes/playbooks via ETag/`If-Match`.
- **Architecture:**
  - Resources include `version` (incrementing) + `etag` hash of content.
  - Middleware enforcing `If-Match`; on mismatch, return `409 CONFLICT` with `{serverVersion, serverDiff, mergeHints}`.
  - Diff generator (field-level) for top 2–3 critical resources (entities, notes, playbooks).
- **Tests:**
  - Concurrent update race triggers conflict with structured diff.
  - Successful update when `If-Match` matches.
- **Docs:** Examples of request/response; guidance for client retries.

## 28) Keyboard Command Palette (frontend) Behind Feature Flag

- **Goal:** `Ctrl/Cmd+K` opens palette for investigator actions (open case, jump to entity, run playbook, export, toggle panes).
- **Architecture:**
  - React component with keyboard-only navigation, ARIA labels, and localStorage for recent commands.
  - Feature flag default off; zero-impact rendering when disabled.
- **Tests:** Component tests for open/close, search filtering, and command execution mocks.
- **Accessibility:** Focus trapping, role="dialog", announce selection; ensure ESC closes.

## 29) Graph Performance: Query Plan Cache + Prepared Statements

- **Goal:** Reduce repeated planning via canonicalized query string + param signature cached per tenant/case with TTL.
- **Architecture:**
  - Prepared plan cache keyed by `{tenant, caseId, canonicalQueryHash, paramSignature}` with bounded size + TTL.
  - Metrics: hit/miss, eviction count, latency delta (microbenchmark harness).
  - Strict isolation to avoid cross-tenant leakage; no reuse when tenant/case differ.
- **Tests:**
  - Same query different tenant does not collide.
  - Eviction respected when capacity exceeded.
  - Benchmark shows latency reduction for repeated queries.

## 30) Security Hardening: CSRF/CORS + Session Binding + Rate Limits

- **Goal:** Harden gateway middleware.
- **Architecture:**
  - CORS allowlist from env; reject others with explicit error codes.
  - CSRF tokens for state-changing routes; missing/invalid token -> `403 CSRF_FAILURE`.
  - Session binding checks (user agent/IP hash) with error `SESSION_BINDING_MISMATCH`.
  - Rate limits per-IP and per-tenant; configurable; exemptions for documented webhooks.
- **Tests:**
  - Allow/deny matrix for CORS.
  - CSRF missing token fails; valid passes.
  - Rate limit triggers with clear messaging.
- **Docs:** Config envs + exemption list.

## 31) Data Quality Gates: Validation Rules + “Quarantine” Bucket

- **Goal:** Validate ingests; quarantine failures with reason and retry/drop flows.
- **Architecture:**
  - Validation pipeline enforcing required fields, type constraints, referential checks.
  - Quarantine store with `{id, caseId, payload, failureReason, firstSeen, lastTried, status}`.
  - APIs: `GET /quarantine?caseId=`, `POST /quarantine/:id/retry`, `POST /quarantine/:id/drop`.
  - Audit logging for quarantine + retry outcomes; idempotent retries.
- **Tests:**
  - Invalid payload routes to quarantine with reason.
  - Retry after fix applies successfully.
  - Drop removes safely without side effects.

## 32) Reproducible Builds: Lockfile Enforcement + Dependency Audit Gate

- **Goal:** CI gate enforcing lockfile integrity, license allowlist, and `npm audit` threshold.
- **Architecture:**
  - CI step verifying lockfile unchanged relative to manifest edits; fail with guidance.
  - License allowlist file; exceptions require justification entry.
  - `npm audit` (or equivalent) with severity threshold; block on violations with clear message.
- **Tests:**
  - Mock CI pipeline fixtures: violating license/audit fails; allowlist respected.
  - Fast execution path; cache dependencies where possible.

## Parallelization map

- Backend-heavy: 25, 26, 27, 29, 30, 31.
- Frontend: 28 (flagged isolated UI).
- Tooling/CI: 32.

## Suggested reviewer checklist

- Contract completeness (APIs/flags documented).
- Deterministic tests cover specified error codes and migrations.
- Isolation: no shared mutable state beyond scoped stores.
- Observability hooks present (metrics/audit/traces).
- Safe defaults (flags off, no auto-apply without explicit enablement).
