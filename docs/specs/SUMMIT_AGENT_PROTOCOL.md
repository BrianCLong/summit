# Summit Agent Protocol (v1-draft)

**Status:** Draft
**Type:** Specification
**Context:** [2026 Strategic Roadmap](../roadmap/strategic/2026_AGENTIC_INFRASTRUCTURE.md)

## Overview
This specification defines the "Summit Agent ABI" (Application Binary Interface), a standard protocol for agent communication, tool definition, and lifecycle management within the Summit ecosystem (Maestro, IntelGraph, and Core). It is designed to be compatible with emerging standards like the Model Context Protocol (MCP) and "Agent-to-Agent" (A2A) interactions.

## 1. Core Principles
1.  **Agents as Services:** Every agent exposes a uniform interface for `invoke`, `status`, and `schema`.
2.  **Manifest-Driven:** Agents declare their capabilities, tools, and resource requirements in a static manifest.
3.  **Stateless by Default:** Agents operate on a `Run` context; state is managed by the orchestrator (Maestro).
4.  **Verifiable Output:** All agent outputs must include provenance metadata and (optional) self-verification scores.

## 2. Agent Manifest (`agent.yaml`)
Every Summit-compliant agent must provide a manifest.

```yaml
apiVersion: summit.io/v1
kind: Agent
metadata:
  name: "deep-researcher"
  version: "0.1.0"
  description: "Autonomous OSINT investigator with deep web retrieval capabilities."
spec:
  role: "researcher" # researcher, critic, writer, router
  capabilities:
    - "search:google"
    - "browser:headless"
  resources:
    memory: "high" # context window hint
  interface:
    inputSchema: # JSON Schema for inputs
      type: object
      required: ["query"]
      properties:
        query: { type: string }
        depth: { type: integer, default: 2 }
    outputSchema: # JSON Schema for outputs
      type: object
      properties:
        summary: { type: string }
        sources: { type: array, items: { type: string } }
        confidence: { type: number }
```

## 3. Communication Protocol

### 3.1 Invocation
Inter-agent calls use a standardized JSON-RPC style envelope.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "agent.invoke",
  "params": {
    "agentId": "deep-researcher",
    "inputs": {
      "query": "status of quantum computing in 2026"
    },
    "runId": "run-12345",
    "context": {
      "traceId": "trace-abc",
      "budget": { "usd": 0.50 }
    }
  },
  "id": 1
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "completed",
    "output": {
      "summary": "...",
      "sources": ["..."],
      "confidence": 0.85
    },
    "metrics": {
      "tokens": 4500,
      "latency_ms": 12000,
      "cost_usd": 0.04
    },
    "provenance": {
      "model": "gpt-4o",
      "timestamp": "2026-01-05T12:00:00Z"
    }
  },
  "id": 1
}
```

### 3.2 Tool Contracts (MCP Compatibility)
Tools are exposed as typed functions. Agents consume tools via the same ABI.

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  arguments: JSONSchema;
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}
```

## 4. Governance & Auto-Judging
To satisfy the "Governance" requirement, every agent response can include a `verification` block.

```json
"verification": {
  "status": "passed", // passed, failed, flagged
  "score": 0.9,
  "checks": [
    { "name": "hallucination-check", "passed": true },
    { "name": "safety-policy", "passed": true }
  ]
}
```

## 5. Roadmap
*   **Phase 1:** Define schemas (this doc).
*   **Phase 2:** Implement `MaestroSDK` support for this protocol.
*   **Phase 3:** Build "Adapter Agents" for external providers (OpenAI Assistants, LangChain).
