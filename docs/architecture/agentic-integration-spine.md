# Agentic Integration Spine Architecture

## Overview

The Agentic Integration Spine is a governed autonomy backbone that turns integration from simple API connections into a controlled, observable, and reliable system for autonomous agents. It ensures that every tool call is authorized, traceable, and safe.

## Core Components

### 1. Integration Gateway (`services/integration-gateway`)
The central control plane that manages tool discovery, invocation, and governance. It enforces:
- **Mandates**: No action without a scoped, valid mandate.
- **Integration Twin**: Simulation and dry-runs before execution.
- **Provenance**: Recording every intent, action, and result.

### 2. Mandates (`packages/mandates`)
A system for delegated authority. Instead of giving agents blanket access, we issue "Mandates":
- **Intent Scope**: What outcomes are allowed.
- **Data Scope**: Which records/tenants can be accessed.
- **Limits**: Spend, rate, deletion limits.
- **Expiry**: Time-bound authority.

### 3. Integration Twin (`packages/integration-twin`)
Provides a "Digital Twin" for integrations to enable safe simulation:
- **Dry Run**: Execute a read-only or mocked version of the action.
- **Diff Preview**: Show what would change if the action were executed.
- **Safety Scoring**: Evaluate the risk of the action.

### 4. Connector SDK (`packages/connector-sdk`)
A typed framework for building reliable connectors:
- **Semantic Adapters**: Shared ontology for inputs/outputs.
- **Reliability**: Built-in retries, backoff, and circuit breakers.
- **Redaction**: Automatic PII/sensitive data stripping from logs.

### 5. Provenance (`packages/provenance`)
The system of record for all agent actions:
- **Trace Model**: Who, What, Why, Inputs, Outputs, Authority.
- **Replay**: Ability to re-execute a trace for debugging or verification.
- **Evidence Bundle**: Cryptographically verifiable log of the action.

## Flow

1. **Intent**: User expresses an intent (e.g., "Refund user X").
2. **Mandate Issuance**: System issues a Mandate scoped to "Refund" for "User X" with limit "$50".
3. **Plan/Dry Run**: Agent proposes a tool call. Gateway runs it through Integration Twin.
4. **Diff/Approval**: Twin produces a Diff. If within policy, proceed; else wait for approval.
5. **Execution**: Gateway executes the tool call via Connector SDK.
6. **Provenance**: Execution result is recorded in Provenance with the Mandate ID.

## Threat Model & Trust Boundaries

- **Gateway** is the trusted boundary. Connectors are potentially untrusted or flaky.
- **Mandates** must be signed or verified by a trusted authority (Policy Engine).
- **Provenance** logs must be immutable (logically).

## SLOs
- **Availability**: 99.9% for Gateway.
- **Latency**: < 200ms overhead for governance checks.
- **Durability**: 100% for Provenance logs.
