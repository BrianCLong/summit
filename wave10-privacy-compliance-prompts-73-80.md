# Wave Ten — Privacy & Compliance Lanes 73–80

This wave packages eight privacy- and compliance-focused prompts into merge-safe, parallelizable lanes. Each lane states scope, APIs/CLIs, acceptance criteria, and tests so teams can execute independently while keeping core schemas stable.

## 73. PII Classification & Tagging — Field Registry and Automatic Tagging at Ingest
- **Module:** `privacy/classification/`
- **Scope:**
  - Field registry captures `fieldPath`, `dataType`, `piiClass` (`none/low/medium/high`), and `handling` (`mask/hash/redact/allow`).
  - Tagger runs at ingest and on write/update endpoints (bounded, schema-driven) and persists tags alongside data as metadata rather than rewriting core schemas.
- **API:** `GET /privacy/fields`; `POST /privacy/fields` (admin-only).
- **Non-goals:** No NLP over raw documents; metadata/structured fields only.
- **Acceptance Criteria:** Unknown fields default to the most conservative handling in restricted contexts; registry changes are audited.
- **Tests:** Unit coverage for registry validation and default-conservative behavior; integration test that an ingest fixture receives expected tags and a registry update is audited.

## 74. Field-Level Access Control — Policy-Enforced Masking/Redaction in Responses
- **Module:** `privacy/flac/`
- **Scope:**
  - Response filter that accepts a payload and `PolicyContext`, returning a filtered payload plus redaction manifest.
  - Supports actions: mask (`****`), hash, remove, truncate, allow.
  - Integrated with three high-value read endpoints only: workspace, search, report export preview.
- **Non-goals:** No rewriting of database records; filtering occurs at response time only.
- **Acceptance Criteria:** Filtering is deterministic and emits a redaction manifest for auditing/debug; secrets never leak via error messages (test this).
- **Tests:** Unit tests for filter rules, manifest correctness, and determinism; integration tests showing the same entity fetched by two roles yields different outputs and manifests explain why.

## 75. Purpose Limitation Enforcement — Purpose Tags Required for Sensitive Reads/Writes
- **Module:** `privacy/purpose/`
- **Scope:**
  - Purpose schema with enumerated purposes and an allowed-operations matrix.
  - Middleware enforcing presence of purpose and validating that the purpose is allowed for the endpoint and data class.
  - Audit logging extended to include purpose on events.
- **Non-goals:** No UI for selecting purposes.
- **Acceptance Criteria:** Requests missing purpose receive actionable 403s listing allowed purposes when safe; purpose appears in audit events for sensitive operations.
- **Tests:** Unit tests for matrix evaluation and error messaging; integration tests where sensitive endpoints deny without purpose and allow with valid purpose.

## 76. Consent & Legal Basis Ledger — Attach Basis Records to Access and Exports
- **Module:** `privacy/basis-ledger/`
- **Scope:**
  - Basis records capture authority ID, legal basis type, jurisdiction, scope, validity window (`validFrom/To`), notes, and attachment pointers.
  - Immutable append-only behavior (new record per update) with versioned history.
  - **API:** `POST /privacy/basis`; `GET /privacy/basis?scope=...`.
  - Export finalize must reference a basis record ID.
- **Non-goals:** No legal advice—structured recordkeeping only.
- **Acceptance Criteria:** Basis records are versioned and never overwritten; export finalize fails closed when basis is missing.
- **Tests:** Unit tests for immutability and validity window checks; integration test creating a basis, requiring it for export finalize, and auditing the reference.

## 77. Redaction Validator — Verify Redaction Completeness Against Policy and PII Tags
- **Module:** `privacy/redaction-validator/`
- **Scope:**
  - Input: bundle manifest, included objects, PII tag metadata, and policy context.
  - Output: pass/fail plus findings (field paths, objects, severity, recommended actions).
  - **CLI:** `redaction:verify <bundlePath> --context <json>`.
- **Non-goals:** No PDF content OCR; structured metadata and extracted fields only.
- **Acceptance Criteria:** Deterministic validator producing stable ordering of findings; “High PII” leaks are hard failures.
- **Tests:** Unit tests for rule evaluation and findings ordering; integration tests where a golden “good” bundle passes and a fixture “leaky” bundle fails with expected finding IDs.

## 78. Safe Synthetic Dataset Generator — De-Identified Fixtures for Dev/Bench
- **Module:** `privacy/synth/` with CLI `synth:generate --seed 123 --cases 5 --size medium`.
- **Scope:**
  - Generates tenants, cases, entities, relationships, docs metadata, annotations, and hypotheses.
  - Deterministic seed support and use of PII registry to ensure generated values are fake and appropriately tagged.
- **Non-goals:** No copying from production or external faker services beyond local libraries.
- **Acceptance Criteria:** Generator never emits real-looking identifiers from any allowlist/denylist set (configurable); output is stable under the same seed.
- **Tests:** Unit tests for determinism and PII-tag compliance; integration tests that generate → ingest → pass invariants and confirm search/workspace endpoints operate on the dataset.

## 79. Audit Sampling & Review Queue — Statistically Sound Spot Checks
- **Module:** `privacy/audit-sampling/`
- **Scope:**
  - Sampling strategies: uniform, risk-weighted (by PII class + operation type), stratified by tenant/case.
  - Review items track event pointer, rationale, reviewer, outcome, and notes.
  - **API:** `POST /privacy/audit-sampling/run?scope=...`; `GET /privacy/audit-sampling/queue?scope=...`; `POST /privacy/audit-sampling/:id/resolve`.
- **Non-goals:** No UI and no auto-enforcement beyond generating review tasks.
- **Acceptance Criteria:** Sampling is deterministic given a seed and input window; outcomes are immutable and audited.
- **Tests:** Unit tests for sampling math, stratification correctness, and determinism; integration tests with fixture events producing expected sampled items (golden set).

## 80. Data Minimization Filters — Least Data Necessary Per Endpoint
- **Module:** `privacy/minimization/`
- **Scope:**
  - Minimization profiles per endpoint/result type defining default fields and optional expansions via `?expand=...`.
  - Expansion requests are policy-checked and logged; applies to `GET /workspace/entity/:id` and `GET /search` while enforcing minimization even if upstream returns extra fields.
  - Developer tool prints effective profiles.
- **Non-goals:** No UI; no breaking API changes—defaults only tighten where contract-safe, using versioning otherwise.
- **Acceptance Criteria:** Minimization enforced despite upstream extras; expansion attempts without permission are denied with reasons and audit events.
- **Tests:** Unit tests for profile resolution and expansion gating; integration tests showing default responses exclude sensitive fields and expansions are allowed only with valid purpose/role.
