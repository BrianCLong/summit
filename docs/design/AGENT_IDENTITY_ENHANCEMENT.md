# Design: Agent Identity & Audit Enhancement

**Status:** Draft
**Date:** Jan 2026
**Context:** [Weekly Signal Checklist](../planning/WEEKLY_SIGNAL_CHECKLIST.md)

## 1. Problem
Strategic guidance for 2026 emphasizes "Identity, security, and resilience as starting points", specifically around **machine identities**. Regulated users (Defense, Finance) need to know *exactly* which agent performed an action, using what tools, and under what policy.

Currently, Conductor agents may operate under a shared system identity or generic "AI" user, lacking granular accountability.

## 2. Goals
1.  **First-Class Agent Identity:** Every running agent instance has a unique, verifiable identity (e.g., `did:summit:agent:<uuid>`).
2.  **Signed Manifests:** Agent code and configuration are cryptographically signed to prevent tampering.
3.  **Audit Trail:** All tool executions (side effects) are logged with the Agent ID, Session ID, and Policy ID.

## 3. Proposed Architecture

### 3.1 Agent Identity Schema
We will extend the `EvidenceObject` model to include `AgentIdentity`.

```typescript
interface AgentIdentity {
  id: string; // did:summit:agent:<uuid>
  name: string; // e.g., "OSINT-Triage-Bot-v2"
  version: string; // semver
  hash: string; // SHA-256 of the agent definition/prompt
  capabilities: string[]; // List of allowed tool scopes
}
```

### 3.2 Conductor Integration
The `Conductor` (Orchestrator) will be responsible for:
1.  **Minting Identity:** On agent startup, generating or retrieving the identity.
2.  **Context Injection:** Injecting the `AgentIdentity` into the `LLMRequest` context.
3.  **Tool Guard:** Intercepting all tool calls to verify if the `AgentIdentity` has the required `capabilities`.

### 3.3 Audit Logging (The "Who Did What" Ledger)
We will introduce a structured audit log separate from debug logs.

**Log Format (JSON):**
```json
{
  "timestamp": "2026-01-15T10:00:00Z",
  "event_type": "TOOL_EXECUTION",
  "agent_id": "did:summit:agent:12345",
  "session_id": "sess-abc-987",
  "tool_name": "github_search",
  "tool_args": { "query": "CVE-2026-001" },
  "policy_id": "policy-oss-read-only",
  "status": "ALLOWED",
  "signature": "..."
}
```

## 4. Implementation Plan

### Phase 1: Identity Object
- [ ] Define `AgentIdentity` schema in `packages/evidence-model`.
- [ ] Update `server/src/agents/types.ts` to include `identity: AgentIdentity`.

### Phase 2: Audit Logger
- [ ] Create `server/src/audit/AgentAuditLogger.ts`.
- [ ] Hook into `LLMRouter` or `ToolExecutor` to emit audit events.

### Phase 3: Policy Enforcement
- [ ] Update `RoutingPolicy` to check `AgentIdentity.capabilities` against requested tools.
