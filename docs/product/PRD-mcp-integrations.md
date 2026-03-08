# PRD: MCP Integrations for Summit Copilot/Agent Runtime

## Summit Readiness Assertion

Reference: `docs/SUMMIT_READINESS_ASSERTION.md`. This PRD is aligned to readiness gates and preserves governed exceptions only when explicitly recorded.

## Executive Summary

Summit will **integrate** MCP (plus MCP Apps) as the default integration substrate for tool connectivity, and provide an **optional** Copilot SDK adapter for customers who already standardize on Copilot tooling. Summit’s runtime and policy plane remain authoritative and enforceable for all tool activity.

## Goals

- Standardize MCP as the primary tool connectivity layer.
- Provide governed MCP Apps rendering with secure sandboxing.
- Enable optional Copilot SDK adapter without expanding tool privileges.
- Produce audit-grade evidence artifacts and deterministic replay support.

## Non-Goals

- Replace Summit’s internal policy plane.
- Provide unbounded tool execution without consent.
- Enable sampling by default.

## Personas & User Stories

### Admin (Governance)

- As an admin, I can allowlist MCP servers and tools per tenant and region.
- As an admin, I can enforce deny-by-default and see audit evidence for every tool call.
- As an admin, I can disable sampling globally and require explicit approvals.

### Builder (Server Onboarding)

- As a builder, I can submit a server manifest with scopes, residency, and egress metadata.
- As a builder, I can validate conformance and security suites offline and attach evidence artifacts.

### End User (Analyst)

- As an end user, I can view a **Trusted Tools** panel showing allowed servers/tools and consent requirements.
- As an end user, I can safely interact with MCP Apps UI inside a sandboxed frame.
- As an end user, I can see clear consent prompts before any tool execution.

## Permissioning UX

- **Consent flow**: per-tool call consent with clear scope summary and data classes.
- **Sampling**: disabled by default; opt-in by admin and explicit user consent per session.
- **Trusted Tools panel**: shows allowlisted servers, tool scopes, risk tier, and residency.

## Packaging & Release Strategy

- **GA**: MCP core support, registry allowlisting, policy-as-code enforcement, audit evidence.
- **Beta**: MCP Apps host rendering (UI sandboxing + CSP enforcement).
- **Optional**: Copilot SDK adapter (requires customer subscription and policy enforcement).

## Requirements

1. Deny-by-default allowlisting for servers and tools.
2. Explicit consent for tool calls and sampling.
3. Deterministic evidence artifacts with hash stamps.
4. MCP Apps iframe sandbox + origin validation + CSP allowlist.
5. Residency-aware routing and egress controls.

## Risks & Mitigations

- **Untrusted server behavior:** sandbox + allowlist + policy enforcement.
- **Feature drift:** version negotiation and capability flags.
- **UI attack surface:** strict iframe sandboxing and CSP enforcement.

## Success Metrics

- Tool invocation success rate ≥ 99.5% for allowlisted servers.
- Gateway p95 added latency ≤ 50ms (excluding server time).
- Audit completeness: 100% of tool calls produce evidence stamps.

## Dependencies

- MCP core protocol implementation.
- Registry + policy control plane.
- UI host sandbox and resource proxy.
- Security threat model and controls documentation.

## Release Checklist (GA Gates)

- MCP conformance suite passes stdio + HTTP.
- Deny-by-default regression proves unapproved servers cannot run.
- Sampling disabled by default with explicit approval flow.
- MCP Apps CSP + origin spoof tests pass (beta gate).
- Audit log append-only + tenant partitioned.
- SLO dashboards + kill-switch runbook ready.

## External Comms (Launch Narrative)

- Summit ships a **governed MCP plane** with deterministic evidence.
- MCP Apps are hosted inside a hardened sandbox with policy enforcement.
- Optional Copilot SDK adapter extends compatibility without weakening controls.

## MAESTRO Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered:** malicious servers, tool poisoning, sampling abuse, UI sandbox attacks.
- **Mitigations:** deny-by-default allowlisting, consent gating, sampling disablement, sandboxed UI.
