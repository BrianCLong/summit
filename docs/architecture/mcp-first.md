# MCP-First Architecture Strategy

## Overview

This document outlines Summit's strategic shift to a **Model Context Protocol (MCP)** first architecture. By standardizing how agents discover, invoke, and reason about tools and resources, we eliminate brittle ad-hoc integrations and enforce security boundaries at the protocol level.

## Capability Map

The MCP architecture consists of three core capability layers:

### 1. Runtime & Discovery (`packages/mcp-runtime`)
- **Tool Registry:** Centralized directory of available MCP servers.
- **Server Discovery:** Dynamic resolution of server endpoints.
- **Client Wrappers:** Standardized JSON-RPC clients for agents.
- **Context Injection:** Hooks for safely injecting deterministic context.

### 2. Context Engineering (`packages/context-kit`)
- **Context Envelopes:** Standardized schema `{version, actor, run_id, inputs, outputs, refs}`.
- **Determinism:** Canonical JSON serialization and stable key ordering to ensure reproducible agent runs.
- **Schema Validation:** Strict runtime checking of context payloads.

### 3. Server Adapters (`packages/mcp-servers`)
- **Internal Tools:** Adapters for existing Summit APIs (Graph, Evidence, Governance).
- **External Gateways:** Secure proxies for 3rd party APIs.
- **Security Boundaries:** Enforced permission scopes per server.

## Adoption Plan

### Phase 1: Scaffolding & Governance (Current)
- Establish the `mcp-runtime` and `context-kit`.
- Define security controls and threat models.
- Create pilot templates for high-value agents (Governance, Evidence).

### Phase 2: Pilot Implementation
- Deploy `governance-agent` using MCP to audit PRs.
- Deploy `evidence-agent` to collect compliance artifacts.
- Validate deterministic context behaviors in CI.

### Phase 3: Legacy Migration
- Wrap existing `server/*` services with MCP adapters.
- Deprecate direct API calls from agents in favor of MCP tool use.
- Enforce strict boundaries: Agents *only* speak MCP.

## Migration Phases

1.  **Preparation:** Define schemas, threat models, and architecture specs (This phase).
2.  **Infrastructure:** Build the runtime and basic server stubs.
3.  **Validation:** Run "Shadow Agents" in CI to verify determinism without blocking.
4.  **Enforcement:** Block non-MCP tool usage for new agents.

## Compatibility Notes

- **Legacy Agents:** Existing scripts and agents will continue to function but are marked for migration.
- **Hybrid Mode:** During migration, the runtime will support a "hybrid" context where legacy context objects are wrapped in an MCP envelope.
- **Security:** MCP servers must implement the Summit Security Protocol (auth tokens + scoped permissions) before production use.
