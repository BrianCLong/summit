# Errata Unified Error Taxonomy Initiative — Jira Ticket Plan

## Program Overview
The Errata program delivers a shared error taxonomy with language-specific libraries, deterministic serializers, and mapper utilities for HTTP, gRPC, and database surfaces across TypeScript and Go. The work ensures canonical codes, consistent Problem+JSON payloads, and guardrails that prevent personally identifiable information (PII) leakage.

## Global Constraints (Apply to ERR-1 through ERR-8)
- **Path isolation:** implementation and tests are limited to `libs/errata/ts/**` and `libs/errata/go/**`; no existing apps or services are modified.
- **Zero runtime coupling:** libraries must be opt-in utilities with no mandatory wiring to gateways, schemas, or runtime startup paths.
- **Deterministic outputs:** every serializer or mapper is covered by golden snapshots that are stable across runs and languages; no tests perform network I/O.
- **Progressive enforcement:** CI checks land as advisory in week one and automatically transition to blocking after one consecutive green week, with the plan documented.
- **Stable documentation:** taxonomy codes and retry semantics ship with human-readable references generated as part of the program deliverables.

---

## ERR-1 — Canonical Error Taxonomy Definition
**Type:** Story  
**Components:** libs/errata/ts, libs/errata/go  
**Goal:** Establish the cross-language taxonomy (codes, hints, retry semantics) that underpins every downstream mapper and formatter.

**Acceptance Criteria**
1. **Given** the compiled taxonomy document, **when** TypeScript and Go consumers load the shared schema artifacts, **then** the same codes, retry flags, and hint metadata are available in both ecosystems without divergence.
2. **Given** the taxonomy specification, **when** Problem+JSON payloads are generated in either language, **then** no PII fields are present and retry guidance aligns with the taxonomy rules.
3. **Given** the documentation build step, **when** it runs in CI, **then** a stable codes reference (Markdown and machine-readable snapshot) is produced without manual edits.

**Definition of Done**
- Approved taxonomy proposal stored alongside generated fixtures and documentation.
- Snapshot artifacts for the taxonomy schema committed and versioned.
- Governance notes captured for code change reviews referencing taxonomy updates.

**Subtasks**
- ERR-1A: Draft taxonomy covering HTTP, gRPC, and database domains including code identifiers, descriptions, retry policies, and hint metadata.
- ERR-1B: Facilitate review with API, platform, and security stakeholders; record approvals and any follow-up actions.
- ERR-1C: Generate and commit golden artifacts (YAML/JSON + Markdown reference) along with a changelog template for future revisions.

---

## ERR-2 — TypeScript Core Error Library
**Type:** Story  
**Component:** libs/errata/ts  
**Goal:** Deliver a fluent TypeScript error builder and Problem+JSON serializer that consume the canonical taxonomy.

**Acceptance Criteria**
1. **Given** a wrapped native error, **when** `Wrap(err).WithCode(code).WithHint(h).WithRetry(r)` is invoked, **then** the resulting object enforces taxonomy codes, strips non-whitelisted metadata, and remains immutable across chaining.
2. **Given** a taxonomy-aligned error, **when** `ToProblemJSON(err)` executes, **then** the payload matches the golden snapshot including type, title, status, code, hint, retry, and correlation identifiers.
3. **Given** the package entry point, **when** it is imported into an application, **then** no side effects execute and the library is tree-shake friendly with documented optional usage.

**Definition of Done**
- TypeScript package scaffolding (tsconfig, linting, testing) lives under `libs/errata/ts` only.
- Jest unit and snapshot suites cover builder behavior, serialization, and error cases.
- README updated with usage examples and guardrails for avoiding PII leakage.

**Subtasks**
- ERR-2A: Scaffold package structure, tooling, and CI configuration for the TS library.
- ERR-2B: Implement the fluent builder, taxonomy validation, metadata redaction, and serializer utilities.
- ERR-2C: Author Jest tests (unit + snapshot) aligned with shared fixtures and publish documentation snippets.

---

## ERR-3 — Go Core Error Library
**Type:** Story  
**Component:** libs/errata/go  
**Goal:** Provide the Go analogue to the TypeScript library with parity behavior and deterministic serialization.

**Acceptance Criteria**
1. **Given** a Go error, **when** the fluent builder mirrors `Wrap(err).WithCode(code).WithHint(h).WithRetry(r)`, **then** taxonomy codes are validated and metadata is sanitized consistently with TypeScript.
2. **Given** equivalent error instances in TS and Go, **when** `ToProblemJSON(err)` runs in both languages, **then** byte output matches the shared fixture snapshots.
3. **Given** the Go module, **when** it is imported, **then** it introduces no new runtime dependencies beyond the standard library and remains optional for services.

**Definition of Done**
- Go module structure (`go.mod`, tooling, Makefile targets) established under `libs/errata/go`.
- Table-driven tests verify builder chaining, serialization, and error handling against shared fixtures.
- Documentation provides parity guidance with the TypeScript package and outlines versioning strategy.

**Subtasks**
- ERR-3A: Initialize Go module, lint/test tooling, and CI workflow isolated to the `libs/errata/go` path.
- ERR-3B: Implement builder, metadata guards, serializer, and taxonomy enforcement logic.
- ERR-3C: Create Go test suite consuming shared fixtures and document usage patterns.

---

## ERR-4 — HTTP Error Mappers
**Type:** Story  
**Components:** libs/errata/ts, libs/errata/go  
**Goal:** Normalize common HTTP client and server errors into the canonical taxonomy with identical cross-language behavior.

**Acceptance Criteria**
1. **Given** representative HTTP errors (2xx edge cases, 4xx, 5xx families), **when** mapped in TS and Go, **then** the same taxonomy codes and retry semantics are produced with no sensitive headers or bodies serialized.
2. **Given** Problem+JSON formatting, **when** HTTP-specific metadata is added, **then** outputs align with snapshots and remain free of request payloads or tokens.
3. **Given** the shared fixtures, **when** parity tests run, **then** TypeScript and Go outputs are byte-identical.

**Definition of Done**
- Mapping tables documented and stored with generated fixtures.
- Tests exercise integrations with Fetch/Axios (TS) and `net/http` (Go) or equivalent adapters.
- README guidance covers extension points for additional HTTP libraries without breaking determinism.

**Subtasks**
- ERR-4A: Define mapping matrices for HTTP status families and common error objects per language.
- ERR-4B: Implement mapper utilities and ensure deterministic serialization through snapshot coverage.
- ERR-4C: Publish shared fixtures validating parity and metadata hygiene.

---

## ERR-5 — gRPC Status Mapping
**Type:** Story  
**Components:** libs/errata/ts, libs/errata/go  
**Goal:** Translate gRPC status codes and metadata to the canonical taxonomy with retry-aware semantics.

**Acceptance Criteria**
1. **Given** all gRPC status codes, **when** processed by the mapper, **then** taxonomy codes and retry hints align with platform guidance across both languages.
2. **Given** gRPC metadata headers, **when** formatted into Problem+JSON, **then** sensitive key/value pairs are stripped, while safe diagnostic hints remain consistent across TS and Go outputs.
3. **Given** shared fixture vectors, **when** parity tests execute, **then** both languages emit identical serialized payloads recorded as golden files.

**Definition of Done**
- Comprehensive mapping tables stored with documentation updates describing retry semantics.
- Snapshot and unit tests validating status code coverage and metadata redaction.
- Playbook for extending mappings to new services without breaching deterministic guarantees.

**Subtasks**
- ERR-5A: Draft gRPC status-to-taxonomy mapping referencing platform retry policy.
- ERR-5B: Implement TS and Go mapper utilities with configurable metadata allowlists.
- ERR-5C: Add fixtures and tests confirming parity and redaction behavior.

---

## ERR-6 — Database Error Mappers
**Type:** Story  
**Components:** libs/errata/ts, libs/errata/go  
**Goal:** Normalize Postgres, MySQL, and ORM/driver errors into the taxonomy while redacting sensitive SQL details.

**Acceptance Criteria**
1. **Given** representative database errors (constraint violations, timeouts, connectivity issues), **when** mapped, **then** consistent taxonomy codes and retry guidance are produced across languages.
2. **Given** SQL statements or parameters embedded in errors, **when** serialization occurs, **then** sensitive values are redacted while preserving debugging context allowed by policy.
3. **Given** golden fixtures for DB scenarios, **when** TypeScript and Go suites run, **then** outputs remain byte-identical and deterministic.

**Definition of Done**
- Documented mapping coverage for Postgres, MySQL, and generic drivers.
- Snapshot suites ensuring no SQL text, secrets, or connection strings leak into Problem+JSON outputs.
- Maintenance guide for onboarding new database adapters under the same hygiene rules.

**Subtasks**
- ERR-6A: Catalog priority DB error signatures and align them to taxonomy codes with retry semantics.
- ERR-6B: Implement mapper adapters in TS and Go, including redaction utilities and configuration tests.
- ERR-6C: Record fixtures validating redaction and parity, integrating them into the shared test harness.

---

## ERR-7 — Problem+JSON HTTP Formatter
**Type:** Story  
**Components:** libs/errata/ts, libs/errata/go  
**Goal:** Provide reusable HTTP response helpers that format canonical errors as Problem+JSON without coupling to host frameworks.

**Acceptance Criteria**
1. **Given** a canonical error with optional correlation identifiers, **when** formatted for HTTP responses, **then** the payload includes `type`, `title`, `status`, `code`, `hint`, `retry`, and correlation fields exactly as defined in the taxonomy snapshots.
2. **Given** middleware or helper usage in TS and Go, **when** integrated, **then** they avoid mutating global state, remain opt-in, and expose configuration hooks for header overrides.
3. **Given** snapshot tests covering success, client error, server error, and validation scenarios, **when** they execute, **then** they pass deterministically and guard against PII leakage.

**Definition of Done**
- Shared schema contract for Problem+JSON stored alongside fixtures and documentation.
- Optional middleware/helpers documented with integration examples and cautions.
- Snapshot results committed and referenced in CI for regression detection.

**Subtasks**
- ERR-7A: Define Problem+JSON schema with taxonomy field mapping and document correlation identifier usage.
- ERR-7B: Implement formatter utilities and lightweight middleware wrappers for both languages.
- ERR-7C: Add snapshot coverage referencing shared fixtures and publish integration guidance.

---

## ERR-8 — Cross-Language Test Harness & Governance
**Type:** Story  
**Components:** libs/errata/ts, libs/errata/go  
**Goal:** Build the shared test harness, fixture pipeline, and governance automation enforcing determinism, parity, and merge hygiene.

**Acceptance Criteria**
1. **Given** shared fixture vectors, **when** the cross-language harness runs, **then** it validates byte-for-byte parity between TypeScript and Go outputs with failures blocking merges once the enforcement window begins.
2. **Given** the governance automation, **when** CI executes, **then** advisory checks report status for the first week and automatically flip to required status after seven consecutive green runs, with documentation tracking the transition.
3. **Given** repository hygiene rules, **when** developers execute the harness, **then** only files under `libs/errata/ts` and `libs/errata/go` are touched, and tooling prevents drift outside the allowed paths.

**Definition of Done**
- Deterministic fixture generation tooling producing language-agnostic artifacts stored under version control.
- CI workflows configured for advisory-to-blocking progression with logged history.
- Governance README/checklist communicating merge rules, fixture update process, and escalation paths.

**Subtasks**
- ERR-8A: Build fixture generation scripts and shared storage for deterministic artifacts.
- ERR-8B: Integrate TypeScript and Go test runners with the shared harness and parity assertions.
- ERR-8C: Document governance policies, configure CI jobs, and publish escalation procedures for future taxonomy revisions.
