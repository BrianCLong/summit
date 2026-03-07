# Wave 16 Missions (121–138)

This pack captures the backend-first delivery plans for wave sixteen, strongly tilted toward **hard infra, safety, and governance**, reinforcing Summit's core architectural tenets (Epistemic Assurance Plane, WriteSet ledger, Epistemic Immune System) that enable evidence-forward GTM motions and secure multi-agent UX.

## 121. WriteSet Ledger Integrity Monitoring (`writeset-monitor/`)

- **Goal:** Real-time cryptographic verification of the append-only bitemporal WriteSet ledger.
- **Scope & Design:**
  - Implement a daemon that continuously hashes and verifies ledger blocks (`summit/core/writeset-ledger/`) against expected state.
  - Detects out-of-order writes, unauthorized mutations, or missing LSNs (Log Sequence Numbers) immediately.
  - Triggers Epistemic Immune System (EIS) high-alert quarantine if ledger corruption is detected, failing closed to protect downstream materialization (Reality/Belief/Narrative graphs).
- **APIs:**
  - `GET /writeset-monitor/status`: Returns current ledger integrity status and latest verified LSN.
  - `POST /writeset-monitor/verify`: Forces an immediate deep scan of a specified LSN range.
- **Testing:** Synthetic ledger corruption injections, LSN gap detection, and performance under high write volume.

## 122. GraphQueryFirewall Policy Enforcer (`query-firewall/`)

- **Goal:** Strict OPA-backed governance for all Cypher/GraphQL queries targeting IntelGraph.
- **Scope & Design:**
  - Expand the existing `GraphQueryFirewall` (`conductor-ui/frontend/server/graph/firewall.ts`) into a dedicated standalone microservice.
  - Integrate with the Epistemic Assurance Plane to enforce tenant isolation, redaction policies, and context-aware access controls on read queries.
  - Sub-50ms caching using `ioredis` to ensure minimal latency impact.
- **APIs:**
  - `POST /query-firewall/evaluate`: Evaluates a proposed query against OPA policies and returns an allowed/denied decision with rewritten Cypher if redaction is required.
- **Testing:** Unit tests for complex Cypher rewriting, OPA policy evaluation correctness, and latency benchmarks under load.

## 123. Epistemic Immune System (EIS) Quarantine Extractor (`eis-quarantine/`)

- **Goal:** Safely extract and inspect quarantined artifacts without exposing them to the main graph.
- **Scope & Design:**
  - Provide a secure, isolated API for analysts to review items caught by the EIS Sentinels and held in the Quarantine Store.
  - Integrates with the Analyst Assist v0.2 UI "Why?" panel to explain *why* an item was quarantined (e.g., policy violation, anomalous pattern).
  - Supports governed overrides (approve/reject) that feed back into the Antibody Library for continuous learning.
- **APIs:**
  - `GET /eis-quarantine/items`: Lists quarantined items with pagination and filtering.
  - `POST /eis-quarantine/decisions`: Records an analyst override decision (requires dual authorization for high-risk items).
- **Testing:** RBAC enforcement for extraction, override feedback loop validation, and audit logging of all decisions.

## 124. Cryptographic Provenance Envelope Generator (`provenance-env/`)

- **Goal:** Standardize and enforce deterministic evidence generation for all connector outputs.
- **Scope & Design:**
  - Extend the `@summit/connector-sdk` to automatically wrap all outputs (`output.json`, `evidence.json`) in a `ed25519` signed envelope.
  - Include execution context (timestamp, policy version, agent identity, input parameters) in the signature payload.
  - Provides the foundational "proof moat" required for the "Provable Action Latency" (PAL) GTM metric.
- **APIs:**
  - `POST /provenance-env/sign`: Generates a signature for a given payload and context.
  - `POST /provenance-env/verify`: Validates an envelope signature and context integrity.
- **Testing:** Signature generation/verification correctness, handling of malformed envelopes, and performance benchmarking.

## 125. Risk-Aware Recovery Plan Orchestrator (`risk-recovery/`)

- **Goal:** Automate graph anomaly recovery using the Self-Healing Graph capabilities.
- **Scope & Design:**
  - Build atop `services/sei/risk-gnn.ts` to coordinate remediation when anomalies (data corruption, schema drift) are detected.
  - Generate structured recovery plans (e.g., rollback to LSN, apply compensating transaction).
  - Integrate human-in-the-loop approval gates for high-impact recovery actions, logged to the Exception Register.
- **APIs:**
  - `GET /risk-recovery/plans/{anomaly_id}`: Retrieves the proposed recovery plan for a detected anomaly.
  - `POST /risk-recovery/execute/{plan_id}`: Executes a plan after required approvals are met.
- **Testing:** End-to-end anomaly detection to plan generation, execution of canary rollbacks, and approval gate enforcement.

## 126. Maestro Epistemic Event Router (`maestro-router/`)

- **Goal:** Centralized governance for all agent and UI workflows interacting with the graph.
- **Scope & Design:**
  - Ensure all writes (e.g., agent hypotheses, analyst annotations) route strictly through the bitemporal WriteSet ledger.
  - Enforce the `summit-lane-model` (candidate -> observed -> reviewed) for all incoming data.
  - Integrates with the Analyst Assist decision strip to provide real-time feedback on event state and confidence.
- **APIs:**
  - `POST /maestro-router/events`: Accepts raw events (e.g., `intent.evaluate`, `claim.register`) and routes them through the appropriate governance pipeline.
- **Testing:** State machine validation for lane transitions, rejection of invalid event payloads, and throughput limits.

## 127. 'Never-Log' Policy Enforcer (`never-log/`)

- **Goal:** Strict compliance with the Epistemic Assurance Plane's sensitive data leakage prevention rules.
- **Scope & Design:**
  - Implement a pre-commit and runtime scanner to prevent full raw source text, analyst freeform notes, private tokens, or credential-bearing URLs from being logged.
  - Employs regex, entropy checks, and ontology-aware scanning.
  - Automatically redacts or drops violating payloads before they reach persistent storage or external logging sinks.
- **APIs:**
  - `POST /never-log/scan`: Scans a payload for violations and returns redacted content or a rejection status.
- **Testing:** PII/credential detection accuracy, false positive minimization, and integration with standard logging libraries.

## 128. Agent Swarm Policy Sandbox (`swarm-sandbox/`)

- **Goal:** Secure execution environment for multi-agent "swarm rooms".
- **Scope & Design:**
  - Provide isolated execution contexts for agent personas (Collector, Correlator, Red-Teamer).
  - Enforce role-based access to tools and graph segments via the GraphQueryFirewall.
  - Capture all intra-agent communication and tool calls for the evidence ledger.
- **APIs:**
  - `POST /swarm-sandbox/sessions`: Initializes a new isolated swarm session.
  - `POST /swarm-sandbox/execute`: Submits an action from an agent within a session.
- **Testing:** Sandbox breakout prevention, role-based access enforcement, and complete audit trail generation.

## 129. Postgres-to-Neo4j Parity Monitor (`parity-monitor/`)

- **Goal:** Real-time detection of data drift between the operational DB and the IntelGraph.
- **Scope & Design:**
  - Automate and continuous run the `tools/parity/neo4j_postgres_parity_check.py` logic.
  - Monitor Debezium/Kafka CDC streams for stalled or failed LSN applications.
  - Alert on checksum mismatches or missing `__tombstone__` records.
- **APIs:**
  - `GET /parity-monitor/status`: Returns current parity status and detected drift metrics.
- **Testing:** Detection of artificially induced data drift, LSN desync recovery, and reporting accuracy.

## 130. Regulatory Early-Warning Gatekeeper (`reg-warning-gate/`)

- **Goal:** Safe, fail-closed management of the Regulatory Early-Warning functionality.
- **Scope & Design:**
  - Centralize management of feature flags (`REGULATORY_EW_ENABLED`, etc.).
  - Enforce the `REGULATORY_EW_OPERATOR_REVIEW_REQUIRED=true` policy for any action triggered by early warnings.
  - Ensure no automated external APIs are called without explicit human approval recorded in the ledger.
- **APIs:**
  - `GET /reg-warning-gate/config`: Retrieves current gate status.
  - `POST /reg-warning-gate/approve`: Records operator approval for a pending regulatory action.
- **Testing:** Fail-closed behavior on missing configs, approval requirement enforcement, and audit logging.

## 131. Immutable Prompt & Policy Version Control (`prompt-vcs/`)

- **Goal:** Git-backed, cryptographically signed storage for prompts, policies, and playbooks.
- **Scope & Design:**
  - Ensure any change to agent prompts or governance policies goes through the same PR-gate and WriteSet ledger process as code.
  - Support instant rollbacks and diffing.
  - Tie specific prompt/policy versions to evidence envelopes for complete explainability.
- **APIs:**
  - `GET /prompt-vcs/versions/{id}`: Retrieves a specific version of a prompt/policy.
  - `POST /prompt-vcs/commit`: Commits a new version (requires cryptographic signature).
- **Testing:** Version history integrity, rollback functionality, and linkage to evidence artifacts.

## 132. Pre-Materialization Eval Harness (`eval-harness/`)

- **Goal:** Automated quality and policy scoring of LLM outputs before they reach human analysts or the graph.
- **Scope & Design:**
  - Run LLM-as-judge and deterministic rubrics against proposed claims/hypotheses.
  - Block or flag outputs that fail confidence thresholds, policy checks, or formatting rules.
  - Feed evaluation metrics into synthetic telemetry dashboards.
- **APIs:**
  - `POST /eval-harness/evaluate`: Scores a proposed output against defined rubrics.
- **Testing:** Eval rubric accuracy, latency impact on workflows, and false-positive/negative rates.

## 133. Synthetic Telemetry Aggregator (`synthetic-telemetry/`)

- **Goal:** Dashboard-ready metrics for system performance, safety, and investigation cost.
- **Scope & Design:**
  - Aggregate metrics on response times, eval pass rates, human override rates, and cost per investigation.
  - Integrate OpenTelemetry semantic conventions for standard observability.
  - Expose metrics for Prometheus/Grafana consumption without leaking sensitive case data.
- **APIs:**
  - `GET /synthetic-telemetry/metrics`: Exposes aggregated metrics in standard formats.
- **Testing:** Metric accuracy, OpenTelemetry normalization, and load handling.

## 134. Analyst Annotation Ingestor (`annotation-ingest/`)

- **Goal:** Treat analyst annotations as first-class, governed epistemic events.
- **Scope & Design:**
  - Process freeform and structured annotations on graph entities.
  - Feed annotations back into the Entity Resolution (ER) and risk scoring engines via the Maestro router.
  - Enforce 'never-log' policies on annotation content.
- **APIs:**
  - `POST /annotation-ingest/annotations`: Submits an annotation for processing and ledger inclusion.
- **Testing:** Annotation routing, integration with ER, and policy enforcement on sensitive content.

## 135. Export Redaction Engine (`export-redaction/`)

- **Goal:** Policy-aware redaction for one-click evidence and narrative exports.
- **Scope & Design:**
  - Apply tenant-specific and data-source-specific redaction policies (e.g., PII obfuscation, source masking) to generated reports and graph views.
  - Ensure exported artifacts maintain cryptographic signatures proving the redaction policy applied.
- **APIs:**
  - `POST /export-redaction/export`: Generates a redacted export based on specified policies.
- **Testing:** Redaction accuracy, handling of edge cases (nested objects), and signature validity.

## 136. Pilot Environment Bootstrap (`pilot-bootstrap/`)

- **Goal:** Automated, deterministic provisioning of pre-configured tenant workspaces.
- **Scope & Design:**
  - Spin up complete environments (dashboards, agents, feeds, policies) using Infrastructure as Code principles.
  - Ensure all newly provisioned environments strictly adhere to baseline governance and safety policies.
- **APIs:**
  - `POST /pilot-bootstrap/provision`: Initiates the provisioning of a new tenant environment.
- **Testing:** Provisioning speed, configuration accuracy against baselines, and isolation from other tenants.

## 137. API Usage Guardrails (`usage-guardrails/`)

- **Goal:** Lightweight, deterministic enforcement of pricing and access tiers.
- **Scope & Design:**
  - Enforce boundaries (e.g., solo analyst vs. enterprise) via the GraphQueryFirewall and Maestro Router.
  - Implement feature flags and rate limiting tied to tenant configuration.
- **APIs:**
  - `GET /usage-guardrails/limits/{tenant_id}`: Retrieves current usage limits and status.
- **Testing:** Rate limiting accuracy, tier boundary enforcement, and failure modes.

## 138. Epistemic Confidence Calibrator (`confidence-calibrator/`)

- **Goal:** Continuous feedback loop to adjust agent confidence scores based on human overrides.
- **Scope & Design:**
  - Capture analyst override events (e.g., approve when blocked, downgrade when approved).
  - Adjust internal weights in the Epistemic Assurance Plane to improve future automated decision-making.
- **APIs:**
  - `POST /confidence-calibrator/feedback`: Submits human override feedback for calibration.
- **Testing:** Calibration effectiveness over time, handling of conflicting feedback, and auditability of weight adjustments.
