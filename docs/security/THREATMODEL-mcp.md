# MCP + MCP Apps + Copilot SDK Adapter Threat Model

## Summit Readiness Assertion

Reference: `docs/SUMMIT_READINESS_ASSERTION.md` (authoritative readiness posture). This threat model is aligned to the current readiness gates and preserves governed exceptions only when explicitly recorded.

## Scope & Assumptions

- Scope: Summit Agent Runtime (SAR), Summit MCP Gateway (SMG), Summit MCP Control Plane (SMCP), Summit UI Host (MCP Apps), optional Copilot SDK adapter.
- Assumptions are **intentionally constrained** pending formal ADR sign-off and legal review outputs noted in the Executive Summary plan.

## MAESTRO Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered:** tool poisoning, malicious MCP server behavior, sampling abuse, UI sandbox attacks, registry/supply chain compromise, policy bypass, data exfiltration, identity spoofing, audit log tampering.
- **Mitigations:** deny-by-default allowlisting, policy-as-code enforcement, explicit consent gating, sampling disablement by default, sandboxed MCP Apps iframe with origin/CSP enforcement, immutable audit logs, deterministic evidence stamps, network egress controls, server sandboxing.

## System Context (Data Flow)

1. SAR issues tool call → SMG validates policy and schema → MCP server executes → SMG returns structured output → SAR emits evidence and updates context pack.
2. MCP Apps path: tool advertises `_meta.ui.resourceUri` → UI Host loads `ui://` resource via SMG proxy → sandboxed iframe → JSON-RPC over `postMessage` with origin + channel validation.
3. Copilot SDK adapter path: SAR delegates to Copilot SDK in isolated process → adapter re-applies Summit policy gates before any tool execution.

## STRIDE Threat Table (GA-grade)

| Threat Category                            | Vector                                                 | Impact                                             | Detection                                                   | Mandatory Mitigations                                                     | Tests/CI Gates                                                                  |
| ------------------------------------------ | ------------------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Spoofing                                   | Malicious MCP server identity or manifest spoof        | Unauthorized tool access, data exposure            | Registry signature verification, audit anomaly alerts       | Signed manifests, registry allowlisting, deny-by-default policy           | `tests/regression/mcp_policy_deny_by_default.test.ts`, manifest signature tests |
| Tampering                                  | Tool description poisoning or tool output manipulation | Prompt injection, policy bypass, incorrect actions | Schema validation failures, provenance hash mismatch        | Treat descriptions as untrusted, schema validation, provenance hash chain | MCP conformance + schema validation suite                                       |
| Repudiation                                | Server denies a tool call or result                    | Audit gaps, compliance failure                     | Evidence chain validation, immutable audit log              | Append-only audit log, hash-chained evidence stamps                       | Audit log integrity tests                                                       |
| Information Disclosure                     | Data                                                   |
| exfiltration via tool output or UI channel | Confidential data leakage                              | DLP rules, audit alerts                            | Policy-enforced data class scopes, egress allowlist, UI CSP | Security regression suite: exfiltration simulations                       |
| Denial of Service                          | Resource exhaustion via tool calls or UI flooding      | Availability loss                                  | Rate-limit alerts, circuit breaker triggers                 | Quotas, timeouts, circuit breakers, per-tenant limits                     | Load/regression tests for MCP Gateway                                           |
| Elevation of Privilege                     | Policy bypass via Copilot SDK default tool enablement  | Unauthorized actions                               | Policy evaluation logs, anomaly detection                   | Mandatory Summit policy hooks, deny-by-default                            | Copilot adapter policy enforcement tests                                        |

## Threat Catalogue & Controls Mapping

### 1) Malicious MCP Server (arbitrary code, exfiltration)

- **Risk:** Remote/local server executes arbitrary code and exfiltrates sensitive data.
- **Controls:** allowlist-only registry, sandboxing for local servers, egress allowlist, strict timeouts, policy-enforced scopes.
- **Evidence:** Immutable audit log + provenance chain + evidence stamps.

### 2) Tool Description Poisoning

- **Risk:** Host trusts tool description metadata and executes unsafe actions.
- **Controls:** treat descriptions as untrusted, schema validation for inputs/outputs, plan linting before execution.
- **Tests:** conformance suite + prompt injection regression tests.

### 3) Sampling Abuse (server-initiated LLM calls)

- **Risk:** Server requests sampling to manipulate/exfiltrate.
- **Controls:** sampling disabled by default, explicit user/admin consent, visibility into prompts.
- **Tests:** sampling-exfiltration simulation suite.

### 4) MCP Apps UI Channel Attacks

- **Risk:** `postMessage` spoofing, iframe escape, CSP bypass.
- **Controls:** sandboxed iframe, strict origin validation, CSP allowlist, resource integrity hashing.
- **Tests:** e2e CSP block, origin spoof prevention.

### 5) Shadow MCP (unapproved server addition)

- **Risk:** Unapproved servers become available to users.
- **Controls:** registry-only discovery, deny-by-default, admin allowlist flow.
- **Tests:** regression deny-by-default.

### 6) Supply Chain Compromise

- **Risk:** Registry or package compromise.
- **Controls:** manifest signing, provenance verification, dependency pinning, SBOM checks.
- **Tests:** signature verification, SBOM diff checks.

## Required Evidence Artifacts

- Evidence ID format: `EVID-YYYYMMDD-mcp-daily-PR##-<slug>`.
- Artifacts: `report.json`, `metrics.json`, `stamp.json` with deterministic seed and hash chain.
- Replay determinism: hash equality across clean runs.

## Governance Requirements

- All decisions requiring compliance review are logged to the DecisionLedger with rollback triggers.
- Any policy exception is recorded as a **Governed Exception** with evidence and expiry.

## Rollback & Quarantine Triggers

- Trigger: repeated policy violations, anomalous sampling requests, or CSP violation spikes.
- Action: disable tool/server, quarantine tenant, revoke allowlist entry, rotate credentials.

## Ownership & Review

- Owner: Security + Governance DRIs.
- Review cadence: per MCP spec update, quarterly security review, and after any policy change.
