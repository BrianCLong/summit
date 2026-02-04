# Summit Intelligence Foundry Specification (v0.1)

## 1. Purpose

An Intelligence Foundry is a bounded, policy-defined environment that transforms governed inputs (assets, data, prompts, tools) into governed outputs (content, decisions, actions) while producing immutable, verifiable evidence of what occurred.

This spec defines the normative requirements for:

- Isolation and tenancy boundaries
- Policy enforcement and authorization
- Provenance, lineage, and reproducibility controls
- Evidence artifacts and attestations
- Model and agent lifecycle governance

Key property:

- For any output, Summit MUST be able to prove (1) what inputs were used, (2) what constraints were enforced, (3) what executions occurred, (4) who authorized them, and (5) what evidence was produced.

## 2. Terminology

- Foundry: The environment (policy + infrastructure + runtime) governing intelligence production.
- Tenant: An isolated organizational boundary.
- Asset: Rights-scoped input entity (documents, media, datasets, code, knowledge).
- Policy: Machine-evaluable constraints (allowed data, tools, model, jurisdictions, retention, approvals).
- Model: Any inference artifact (foundation, fine-tuned, adapter, prompt-program).
- Agent: An orchestrated actor that may call tools and produce outputs under policy.
- Tool: External capability invoked by agents (DB query, browser, transformer, deployment, etc.).
- Work Order: A bounded unit of work to be executed in the Foundry.
- Execution Graph: A provenance DAG capturing runs, tool calls, artifacts, and approvals.
- Evidence Bundle: Deterministic package of signed evidence artifacts.
- Attestation: A cryptographically signed statement about a build/run/output.

Normative language:

- MUST / MUST NOT / SHOULD / MAY are used as defined in RFC 2119.

## 3. Foundry Types

A Foundry is parameterized by domain. Examples:

- Creative Foundry: image/video/audio/3D generation under brand/IP constraints
- Intelligence Analysis Foundry: OSINT/analytic workflows with source provenance
- Compliance Foundry: policy evaluation, controls mapping, evidence generation
- Finance Risk Foundry: model-driven scoring with audit and model governance

All Foundry types MUST implement the same governance substrate (Sections 4–12).

## 4. Tenancy and Isolation

4.1 Tenant Isolation

- A Foundry MUST be tenant-isolated at data, model, and evidence layers.
- Cross-tenant training, caching, embeddings, or retrieval MUST be disabled by default.
- Any cross-tenant sharing MUST require explicit policy grants and be auditable.

4.2 Data Boundaries

- Assets MUST carry a rights and jurisdiction profile.
- Foundry runtime MUST enforce jurisdictional and licensing constraints at access time.

4.3 Execution Isolation

- Tool calls MUST be mediated by a policy gateway.
- Secrets MUST be scoped to work order + tool + tenant and be short-lived.

## 5. Identity, Authorization, and Approvals

5.1 Identity

- All work orders MUST be attributable to a principal (human or service).
- All agent actions MUST be attributable to a delegated principal.

5.2 Authorization

- Foundry MUST implement policy-based access control (PBAC) at minimum.
- Authorization decisions MUST be logged as first-class provenance nodes.

5.3 Approvals

- Policy MAY require approvals for classes of work orders (e.g., publish, deploy, export).
- Approvals MUST be captured as signed events in the execution graph.

## 6. Policy Model

6.1 Policy Evaluation

- All access to assets, models, and tools MUST be policy-evaluated.
- Policies MUST be versioned, immutable once activated, and referenced by hash.

6.2 Policy Scope
Policy MUST support constraints for:

- Data sources and asset classes
- Model selection and version constraints
- Tool allow-listing and parameter constraints
- Output destinations and exfiltration controls
- Retention, redaction, and disclosure rules
- Reproducibility mode (strict vs best-effort)
- Human approvals and quorum requirements

6.3 Deny-by-default

- The Foundry MUST support deny-by-default posture for tools and data.
- Any allow rule MUST be explicit.

## 7. Provenance and Lineage

7.1 Execution Graph

- Each work order MUST emit an execution graph (DAG) containing:
  - inputs (assets, prompts, policies, model IDs)
  - executions (inference runs, tool calls)
  - outputs (artifacts, decisions, actions)
  - approvals and authorization decisions
  - environment metadata (runtime, container digest, code revision)

7.2 Lineage Integrity

- Each node and edge MUST be content-addressed (hash).
- Graph serialization MUST be deterministic.

7.3 Retrieval Provenance

- If retrieval is used, the Foundry MUST record:
  - query, retrieval method, index version
  - all retrieved chunks/doc IDs with hashes
  - ranking scores and filters applied

## 8. Reproducibility Modes

8.1 Strict Reproducibility (Deterministic Mode)

- For eligible workloads, Foundry MUST support strict mode:
  - fixed model version/digest
  - fixed prompts and tool parameters
  - pinned dependencies/container digests
  - recorded random seeds
  - deterministic serialization of outputs where feasible

8.2 Best-Effort Reproducibility

- For non-deterministic models/services, Foundry MUST record:
  - provider, model name/version, request ID
  - temperature/top_p and randomness parameters
  - full prompt and tool call trace
  - response hashes and timestamps

8.3 Policy Selection

- Reproducibility mode MUST be chosen by policy and recorded in the execution graph.

## 9. Evidence and Attestations

9.1 Required Evidence Artifacts
Each work order MUST produce, at minimum:

- work_order.json (inputs, principal, policy version, requested outputs)
- execution_graph.json (deterministic DAG)
- artifacts_manifest.json (hashes, sizes, locations)
- policy_decisions.json (all allow/deny decisions with reasons)
- attestation.json (signed statement binding the output to graph + policy)
- stamp.json (timestamps, environment identity, build/run metadata)

9.2 Signing and Verification

- Attestations MUST be signed using tenant-controlled keys or approved trust anchors.
- Verification MUST be possible offline with the evidence bundle.

9.3 Retention

- Evidence retention MUST be policy-driven and enforceable.
- Evidence MUST be immutable once sealed.

## 10. Model Governance

10.1 Model Registry

- Models MUST be registered with:
  - provenance (training data references, if available)
  - licensing / usage constraints
  - evaluation results and drift signals
  - security scanning and integrity metadata
- Model versions MUST be immutable and referenced by digest.

10.2 Training / Fine-Tuning

- Training jobs MUST be work orders with the same evidence requirements.
- Training datasets MUST be represented as assets with rights metadata.

10.3 Deployment

- Model deployment MUST require explicit policy allow and may require approvals.
- Deployed model endpoints MUST be bound to tenant + policy + version.

## 11. Agent Governance

11.1 Agent Contracts

- Agents MUST declare:
  - purpose and scope
  - allowed tools
  - required approvals
  - output types
- Agents MUST run under a policy sandbox.

11.2 Tool Mediation

- All tool invocations MUST pass through policy gateway.
- Tool invocation parameters MUST be recorded and hashed.

11.3 Safety and Exfiltration Controls

- Foundry MUST support output filtering, watermarking, redaction, and destination control.
- High-risk tools (browser, export, email) MUST be gated by policy and approvals.

## 12. Non-Functional Requirements

- Observability: all policy and execution events must be traceable
- Performance: provenance capture MUST NOT be optional; it must be efficient
- Usability: developers must be able to integrate via APIs/events
- Compliance: evidence bundles must support SOC2/ISO/NIST mapping
- Portability: evidence bundle MUST be verifiable independent of platform

## 13. Compliance Mapping (Non-Normative)

The Foundry governance substrate is designed to map to:

- SOC2 (change management, access, logging)
- ISO 27001 (asset mgmt, access control, operations security)
- NIST 800-53 (AU, AC, CM, SI families)

Concrete mappings are implemented in EVIDENCE_ATTESTATIONS.md.
