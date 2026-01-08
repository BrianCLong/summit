# ADR-002: Centralized LLM client architecture

- Status: Accepted
- Date: 2025-12-06
- Deciders: Architecture Guild
- Contributors: AI Platform, Security Engineering
- Tags: llm, platform, observability

## Context

Multiple services (graph enrichment, copilots, provenance checks, UI experiences) depend on LLM calls for generation, retrieval, and scoring. Disparate client implementations increase spend variance, make guardrails inconsistent, and complicate audit trails. We need a unified way to manage provider failover, safety filters, and telemetry across the platform.

## Decision

Adopt a centralized LLM client layer exposed as a shared package and reusable service adapters. The client standardizes provider selection, retries, safety policies, and observability hooks, and it exposes a stable interface for both server-side workloads and agentic tools. Downstream services consume the shared client rather than creating bespoke integrations.

## Consequences

- Consistent safety and governance: the same moderation, rate limits, and provenance headers apply across services.
- Lower integration cost: new features and services onboard by wiring to the shared client instead of re-implementing provider logic.
- Operational leverage: centralized telemetry enables cost/performance tuning and incident response for LLM usage.
- Tradeoffs: the shared layer becomes a dependency hotspot; we must maintain strong versioning and backward-compatibility contracts.

## Options Considered

- Option A: Service-specific LLM clients (rejected: divergent policies and duplicated effort).
- Option B: Provider SDK passthroughs with minimal shims (rejected: weak governance and limited observability).
- Option C: Centralized client with policy and telemetry controls (chosen).
