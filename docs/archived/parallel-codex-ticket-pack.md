# Parallel Codex Dev Prompts — Ticket Pack v1

This document captures the seven parallel, merge-safe tickets from the "Parallel Codex Dev Prompts" handoff. Each ticket is self-contained with frozen contracts, explicit deliverables, and acceptance criteria.

## Ticket 1 — Provenance & Claim Ledger (Service)
- **Epic:** Evidence Provenance
- **Summary:** Standalone microservice to register claims/evidence and emit verifiable manifests.
- **Scope:** REST service (OpenAPI v1), Ed25519 signing, SHA-256 digests, RFC3339 timestamps, CloudEvents emission, CLI for bundling/verifying manifests.
- **Out of Scope:** Policy evaluation, decryption/PII handling.
- **Contracts:**
  - `POST /claims` → `{ claimId }` (inputs: `sourceUri, hash, type, confidence, licenseId`)
  - `POST /evidence` → `{ evidenceId }` (inputs: `claimId, artifactDigest, transformChain[]`)
  - `GET /manifest/{bundleId}` → manifest JSON (Merkle root + nodes)
  - Events: `claims.v1.created`, `manifests.v1.emitted`
- **Deliverables:** Service at `services/prov-ledger/`, OpenAPI spec at `contracts/v1/prov-ledger/openapi.yaml`, CLI `plc` (bundle, verify), verifier library + test vectors.
- **Acceptance:** Golden bundle verified bit-for-bit by external verifier; ≥95% coverage on hash/chain core; deterministic manifest ID from identical inputs.
- **Scaffolding:**
  ```bash
  mkdir -p services/prov-ledger contracts/v1/prov-ledger tools/plc
  ```
- **CI Gates:** `make test`, `make lint`, `make docker`, `make e2e`; CI lint/unit/e2e/SCA/OpenAPI breaking-change check.

## Ticket 2 — License/Authority Compiler (Policy Engine)
- **Epic:** Usage Policy
- **Summary:** Compile licenses/authorities/purpose tags into executable policy bytecode and return human-readable explanations.
- **Scope:** Policy compiler + simulator + OPA adapter with deterministic decision tracing.
- **Out of Scope:** Secrets storage; user accounts.
- **Contracts:**
  - `POST /compile` `{ licenses[], authorities[], purposeTags[] } → { policyId, bytecode }`
  - `POST /simulate` `{ policyId, queryPlan } → { allowed, reason[] }`
  - `POST /explain` `{ decisionId } → { rulesHit[], citations[] }`
- **Deliverables:** Service at `services/policy-compiler/`, bytecode spec doc + golden pack, contract tests.
- **Acceptance:** Unsafe op fixtures rejected; simulator output stable (same inputs → identical JSON).
- **Scaffolding:**
  ```bash
  mkdir -p services/policy-compiler contracts/v1/policy-compiler
  ```
- **CI Gates:** OPA adapter tests; spec consistency linter.

## Ticket 3 — Connectors & ETL Assistant (Ingest)
- **Epic:** Data Ingest
- **Summary:** Streaming ETL + mapping wizard with PII flags and license enforcement.
- **Scope:** Session-based ingest, schema mapping, quarantine path; enrichers (GeoIP, language, hash/perceptual-hash, EXIF scrub, OCR stub); emit normalized records + lineage to Kafka `normalized.v1`.
- **Out of Scope:** Downstream storage/graph writes.
- **Contracts:**
  - `POST /ingest/sessions` → `{ sessionId }`
  - `POST /ingest/{sessionId}/map` `{ sample, mapping } → { validatedMapping }`
  - `POST /stream` (NDJSON) → `{ accepted, quarantined }`
- **Deliverables:** Server at `data/ingestion/`, minimal headless wizard UI, three reference connectors (CSV, S3, HTTP), DPIA checklist JSON.
- **Acceptance:** CSV→canonical mapping completed in ≤10 minutes using fixtures; poison samples quarantined with actionable rationale.
- **Scaffolding:**
  ```bash
  mkdir -p data/ingestion ui/ingestion
  ```
- **CI Gates:** Lint/unit/e2e plus contract tests per workspace defaults.

## Ticket 4 — NL→Graph Query & Graph-RAG (Copilot Core)
- **Epic:** Assisted Analysis
- **Summary:** NL-to-Cypher generator with sandbox execute plus RAG answers with inline citations.
- **Scope:** NL→Cypher endpoint with schema hints; read-only sandbox execution; RAG answers must include resolvable citations.
- **Out of Scope:** Writes to production DB; uncited model outputs.
- **Contracts:**
  - `POST /nl2cypher` `{ prompt, schemaHints } → { cypher, costEstimate }`
  - `POST /sandbox/execute` `{ cypher } → { rows, warnings }`
  - `POST /rag` `{ question, corpusId } → { answer, citations[] }`
- **Deliverables:** Service at `services/ai-copilot/`, prompt library & schema-aware mapper, citation inspector module.
- **Acceptance:** ≥95% syntactic validity on test prompts; all published answers include valid citations (no missing-citation errors in e2e).
- **Scaffolding:**
  ```bash
  mkdir -p services/ai-copilot prompts/ai-copilot
  ```

## Ticket 5 — Zero-Knowledge Trust Exchange (ZK-TX)
- **Epic:** Federated Trust
- **Summary:** Cross-tenant overlap checks via ZK proofs; no raw PII leaves a tenant.
- **Scope:** Circuits for set/range proofs; verifier library + CLI demo.
- **Out of Scope:** Identity reveal; escrow.
- **Contracts:**
  - `POST /proofs/overlap` `{ saltedHashes[] } → { zkProof }`
  - `POST /verify` `{ zkProof } → { overlap, leakage:0 }`
- **Deliverables:** Assets under `federation/zk-tx/` (circuits, verifier, CLI), security notes + auditor script.
- **Acceptance:** True/false overlap fixtures verify with zero leakage; auditor script reproduces end-to-end.
- **Scaffolding:**
  ```bash
  mkdir -p federation/zk-tx tools/zk-tx
  ```

## Ticket 6 — Tri-Pane UI + "Explain This Decision" (Frontend Kit)
- **Epic:** Analyst UX
- **Summary:** React kit (map + timeline + graph) with synchronized brushing and an Explain panel rendering evidence and policy bindings.
- **Scope:** Component library + demo app; accessibility AAA, keyboard-first, dark/light.
- **Out of Scope:** Writes; user accounts.
- **Routes/Contracts:** `/cases/:id`, `/views/:id/explain`; reads only public contracts from other services (mocks supplied).
- **Deliverables:** `apps/web/tri-pane/` (React + Tailwind), Explain panel with expandable citations that open the evidence map.
- **Acceptance:** Usability task—time-to-COA comparison reduced ≥30% (n≥8 participants, baseline vs. kit); no paragraph renders uncited assertions.
- **Scaffolding:**
  ```bash
  mkdir -p apps/web/tri-pane
  ```

## Ticket 7 — Edge "Expedition Kit" (Offline/CRDT)
- **Epic:** Edge Ops
- **Summary:** Disconnected analysis kit with local lineage logging and proof-carrying CRDT sync.
- **Scope:** Desktop app (Tauri/Electron), CRDT log, merge visualizer; offline manifest signer and reconnect merge.
- **Out of Scope:** Central policy edits (consume compiler snapshots only).
- **Contracts:**
  - `POST /edge/runbook` `{ runbookId, inputs } → { receipt }`
  - `POST /edge/sync` `{ receipts[] } → { merged, conflicts[] }`
- **Deliverables:** `edge/expedition-kit/` app + CRDT library.
- **Acceptance:** Disconnected run produces verifiable receipt; reconnection merges deterministically with zero data loss.
- **Scaffolding:**
  ```bash
  mkdir -p edge/expedition-kit
  ```

## Global Merge Hygiene (All Tickets)
- Each service owns its OpenAPI spec under `contracts/v1/{service}/openapi.yaml`; no cross-editing.
- Unique namespaces, package names, and DB schemas; no shared tables.
- CloudEvents JSON with `type={domain}.v1.*`; publish only (use consumer test doubles).
- Security: OIDC/JWKS bearer tokens; no user stores.
- Flags: `FF_{SERVICE}_ENABLED` default off.
- Branching: trunk-based, short-lived (≤2 days), conventional commits.
- CI: lint, format, unit, contract tests, e2e smoke, SCA, license scan, OpenAPI/Proto breaking-change detector.

## Definition of Ready & Done
- **Ready:** Owners assigned; environments available; fixtures present; contract versioned; alerts defined; rollback plan documented.
- **Done:** Feature flagged; dashboards and runbooks merged; docs linked from README; security/PIA notes stored; e2e passing; artifact published.
