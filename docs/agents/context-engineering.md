# Context Engineering & Determinism

## Overview

In the Summit MCP architecture, **Context Engineering** is the discipline of ensuring that agent inputs, outputs, and intermediate states are captured in a **deterministic, replayable format**. This allows us to verify agent behavior, audit decisions, and debug failures with 100% fidelity.

## The Context Envelope

Every MCP interaction (tool call, resource read, prompt request) must be wrapped in a **Context Envelope**. This envelope provides metadata for governance and a stable container for data.

### Structure

A Context Envelope consists of:

- **Version:** Schema version (e.g., `1.0.0`).
- **Actor:** The identity of the agent or user initiating the action.
- **Run ID:** A unique trace ID for the session.
- **Inputs:** The arguments or prompt provided to the agent.
- **Outputs:** The result returned by the tool or model.
- **Refs:** References to external artifacts (Evidence IDs, Governance Policies).

## Deterministic Serialization

To ensure that the hash of a context object is stable (for signing and caching), we strictly enforce **Canonical JSON**:

1.  **Key Ordering:** All JSON object keys must be sorted lexicographically (A-Z).
2.  **No Whitespace:** Compact JSON (no indentation) is preferred for hashing, though pretty-printing is allowed for logs.
3.  **Timestamps:**
    - **Prohibited:** `Date.now()` or nondeterministic timestamps in the *inputs* that affect logic.
    - **Allowed:** Timestamps in *metadata* logs, provided they are excluded from the content hash.
4.  **Floating Point:** Use fixed precision or string representation to avoid architecture-specific drift.

## Schema

The authoritative schema for the Context Envelope is located at:
[`context/schemas/context-envelope.json`](../../context/schemas/context-envelope.json)

## Implementation Guidance

### For MCP Servers

- Return data in a stable order (e.g., sort lists by ID).
- Do not include dynamic fields (uptime, current server time) in the response body unless requested as a specific data point.

### For Agents

- Always validate inputs against the `context-envelope.json` schema.
- Fail fast if the envelope is malformed or missing required metadata.
