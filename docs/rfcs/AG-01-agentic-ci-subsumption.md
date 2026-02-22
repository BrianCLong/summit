# RFC AG-01: Agentic CI Subsumption for Summit/Maestro

**Status:** Draft  
**Author:** Codex (Engineer)  
**Date:** 2026-02-08  
**Priority:** High (Governance + CI Modernization)  
**Alignment:** Summit Readiness Assertion (docs/SUMMIT_READINESS_ASSERTION.md)

## Problem Statement

The ecosystem is converging on agentic CI patterns while the tooling landscape fragments into
framework-specific approaches. Summit/Maestro must subsume the durable patterns (agent-as-step,
policy-as-code, evidence-first summaries) without becoming a new framework. This RFC defines the
minimum viable subsumption plan that keeps governance deterministic and preserves the golden path.

## Goals

- Provide a **fleet-of-small-agents** model that compiles into native GitHub Actions.
- Encode governance and security rules as **policy-as-code** with PR summaries.
- Ship **opinionated DevSecOps pipeline templates** aligned to OWASP guidance.
- Deliver a **TypeScript-first DSL** that targets Summit runtime and GitHub Actions.
- Offer **framework adapters** to wrap external agent frameworks under Summit orchestration.

## Non-Goals

- Replacing existing CI providers or security tools.
- Building a monolithic agent framework.
- Introducing open-ended, non-deterministic execution.

## Proposed Architecture

### 1) Agentic CI Compiler (Agent Graph → GitHub Actions)

- Author task-scoped agents as graph nodes with explicit inputs/outputs.
- Compile graphs into GitHub Actions YAML with traceable steps and diff-visible config.
- Enforce deterministic execution order and bounded evidence budgets.
- Produce governed summaries that map each agent output to policy thresholds.

### 2) Governance Policy-as-Code Layer

- Define policy rules in YAML/JSON, compiled into CI checks.
- Emit **PR policy summaries** showing pass/fail, thresholds, and deltas.
- Require all policy definitions to reference authority sources and versioned rulebooks.
- Treat legacy bypasses as **Governed Exceptions** with expiry and rollback triggers.

### 3) DevSecOps Pipeline Templates

- Provide default templates for:
  - Secrets scanning, SCA, SAST, IaC scanning, DAST, API security.
  - Infrastructure posture checks and compliance validation.
- Attach Summit agents that triage and prioritize findings under policy thresholds.

### 4) TypeScript Workflow DSL

- Provide a TS DSL to define agent graphs with type-safe contracts.
- Compile targets:
  - Summit runtime (native)
  - GitHub Actions (YAML)
- Include policy bindings, evidence budgets, and CI-timeout constraints.

### 5) Framework Adapters

- Implement adapters for one or two major agent frameworks (e.g., AutoGen-style group chats).
- Present a single orchestration contract and telemetry schema.
- Maintain reversible integration contracts to avoid vendor lock-in.

## MAESTRO Threat Modeling Alignment

- **MAESTRO Layers:** Foundation, Agents, Tools, Infra, Observability, Security.
- **Threats Considered:**
  - Goal manipulation via prompt injection in agent inputs.
  - Tool abuse through unscoped execution or unbounded traversal.
  - Policy bypass through unversioned governance rules.
- **Mitigations:**
  - Evidence-budgeted execution with enforced limits.
  - Policy-as-code validation with versioned authority references.
  - Observability hooks with deterministic audit logs.

## Governance & Compliance

- All regulatory logic remains policy-as-code; any non-encodable requirement is treated as
  **incomplete** and deferred pending governance review.
- Decision reversibility required for all autonomous changes (explicit rollback plan below).
- All outputs cite authority files, not opinions.

## Implementation Plan (Compressed Timeline)

1. **Phase 0 — Readiness Assertion**
   - Validate alignment against docs/SUMMIT_READINESS_ASSERTION.md.
2. **Phase 1 — Agent Graph Schema + Compiler**
   - Define graph schema, compiler, and YAML generator.
3. **Phase 2 — Policy-as-Code MVP**
   - YAML rules, CI validation action, PR summary comment.
4. **Phase 3 — DevSecOps Templates**
   - Publish baseline templates and evidence bundle emitters.
5. **Phase 4 — TS DSL + Adapters**
   - Ship minimal DSL and two adapters with telemetry parity.

## Rollback Plan

- Revert compiler output generation and disable action generation.
- Restore prior CI templates from versioned release tags.
- Remove adapter registrations and revert to native agent execution.

## Evidence & Sources

- GitHub agentic CI prototype patterns and Action compilation model.
- GitHub Advanced Security policy-as-code repository patterns.
- OWASP DevSecOps pipeline guidance.
- Agent framework lists for adapter patterns.
- GitHub Octoverse TypeScript adoption trend.

## Decision

**Status:** Proposed for approval. Execution is **deferred pending** governance sign-off and policy
threshold review.
