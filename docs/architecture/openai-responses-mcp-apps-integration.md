# OpenAI Responses + MCP Apps Integration Plan

## Readiness Assertion

This plan aligns with the Summit Readiness Assertion and treats platform shifts as mandatory readiness work. See `docs/SUMMIT_READINESS_ASSERTION.md` for the readiness authority baseline.

## Scope and intent

Summit will integrate two external platform shifts with explicit, governed architecture:

1. OpenAI Assistants deprecation and migration to Responses/Conversations by 2026-08-26.
2. MCP Apps interactive UI resources for governed, low-friction review and operations surfaces.

## MAESTRO alignment

**MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.

## LLM Gateway: provider-agnostic surface

The LLM Gateway establishes a provider-agnostic contract for generation, tool-calling, and embeddings, with explicit conversation state modes.

### TypeScript interfaces (public API)

```ts
// libs/llm-gateway/src/types.ts
export type ConversationMode =
  | "summit-managed"
  | "openai-previous-response"
  | "openai-conversations";

export interface GatewayRequest {
  requestId: string;
  tenantId: string;
  userId: string;
  instructions?: string;
  input: string | Array<{ role: "user" | "system" | "assistant"; content: string }>;
  tools?: Array<{ name: string; description: string; parameters: unknown }>;
  conversationId?: string;
  conversationMode: ConversationMode;
  store?: boolean;
}

export interface GatewayResponse {
  responseId: string;
  outputText: string;
  toolCalls?: Array<{ name: string; arguments: unknown }>;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
}

export interface LlmGatewayAdapter {
  generate(request: GatewayRequest): Promise<GatewayResponse>;
  embed(request: { input: string | string[]; model?: string }): Promise<number[][]>;
}
```

### Python interfaces (public API)

```py
# libs/llm_gateway/types.py
from dataclasses import dataclass
from typing import Literal, Optional, Sequence, TypedDict

ConversationMode = Literal[
    'summit-managed',
    'openai-previous-response',
    'openai-conversations',
]

class ToolDef(TypedDict):
    name: str
    description: str
    parameters: dict

@dataclass
class GatewayRequest:
    request_id: str
    tenant_id: str
    user_id: str
    instructions: Optional[str]
    input: str | Sequence[dict]
    tools: Optional[list[ToolDef]]
    conversation_id: Optional[str]
    conversation_mode: ConversationMode
    store: Optional[bool]

@dataclass
class GatewayResponse:
    response_id: str
    output_text: str
    tool_calls: Optional[list[dict]]
    usage: Optional[dict]

class LlmGatewayAdapter:
    def generate(self, request: GatewayRequest) -> GatewayResponse: ...
    def embed(self, input: str | list[str], model: Optional[str] = None) -> list[list[float]]: ...
```

## Provider adapter: OpenAI Responses

OpenAI Responses becomes the primary provider implementation, with optional conversation persistence when policy allows it.

### Conversation virtualization modes

1. **Summit-managed (default):** Summit stores canonical state and sends curated context. Provider persistence is disabled (`store=false`).
2. **OpenAI previous response:** Summit chains `previous_response_id` when allowed by tenant policy and environment.
3. **OpenAI Conversations:** Summit creates and uses OpenAI conversation objects where policy explicitly allows provider-side state.

All modes are configured per-tenant and per-environment; deviations are documented as Governed Exceptions.

## Dependency graph and module boundaries

```
services/*
  -> libs/llm-gateway/*
      -> libs/providers/openai-responses/*
          -> OpenAI SDK or thin HTTP client
services/devtools/summit-mcp/*
  -> libs/mcp/* (server framework + auth)
  -> apps/mcp/pr-gate-ui/* (bundled static UI assets)
```

Boundary rules:

- Services depend on `libs/llm-gateway` only.
- Provider adapters are isolated under `libs/providers/*`.
- UI resources are served via MCP resources and bundled assets, not runtime templates.

## Assistants to Responses mapping

- **Assistant instructions** map to per-request `instructions` and versioned prompt templates.
- **Threads** map to Summit conversation IDs; provider conversations are optional and policy-bound.
- **Runs** map to Responses calls with tool-calling loop managed by Summit.
- **Files / tools** map to Responses tool definitions and Summit-managed tool execution.

## Feature flags and rollback

Feature flags are required for every cutover:

- `LLM_PROVIDER=openai_responses` (default `openai_assistants` until pilot completes)
- `LLM_CONVERSATION_MODE=summit-managed|openai-previous-response|openai-conversations`
- `LLM_STORE_DEFAULT=true|false` (tenant override required)

Rollback strategy:

- Flip `LLM_PROVIDER` to previous provider adapter.
- Disable provider persistence by forcing `LLM_CONVERSATION_MODE=summit-managed`.
- Restore last-known-good prompt templates from versioned config.

## Migration plan (implementation stubs)

### Proposed file tree additions

```
libs/llm-gateway/
  src/
    index.ts
    types.ts
    gateway.ts
    policy.ts
  tests/
    gateway.request-shape.test.ts

libs/providers/openai-responses/
  src/
    index.ts
    openai-responses-adapter.ts
    conversation-mode.ts
  tests/
    responses.adapter.request.test.ts

services/devtools/summit-mcp/
  src/
    tools/pr_gate.ts
    resources/pr_gate_dashboard.ts
    auth/*

apps/mcp/pr-gate-ui/
  src/index.tsx
  dist/index.html
```

### Test strategy stubs

- Unit tests for request shaping and tool loop behavior for `openai-responses-adapter`.
- Golden tests for conversation virtualization modes with fixture inputs and deterministic outputs.
- Contract tests for tool call policy enforcement and audit logging.

## MCP Apps integration (high-level)

- MCP tool declarations include `_meta.ui.resourceUri`.
- UI resources are served via `ui://summit/...` and rendered in sandboxed iframes.
- JSON-RPC communication is mediated by host approval gates and policy enforcement.

## Security threat model and controls

### STRIDE for Responses/Conversations

| STRIDE                 | Threat                                         | Impact                    | Mitigation                                                          | Testable control                                       |
| ---------------------- | ---------------------------------------------- | ------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| Spoofing               | Tenant impersonation in request metadata       | Cross-tenant data leakage | Tenant-scoped auth + policy evaluation per request                  | Unit test: reject missing/invalid tenant claims        |
| Tampering              | Altered request/response logs                  | Audit gaps                | Hash-chained audit ledger entries                                   | Ledger verification test for hash chain continuity     |
| Repudiation            | Provider-side data retention dispute           | Compliance failure        | Explicit `store` policy per tenant; Summit-managed default          | Integration test: `store=false` enforced when required |
| Information Disclosure | Provider retains data against residency policy | Policy breach             | Default Summit-managed memory; Conversations only allowed by policy | Policy conformance tests for tenant overrides          |
| Denial of Service      | Excessive prompt sizes or tool loops           | Service instability       | Budget enforcement and truncation                                   | Load test with enforced limits                         |
| Elevation of Privilege | Unauthorized use of Conversations mode         | Data retention violation  | Policy gate requiring explicit approval                             | Policy gate unit test                                  |

### STRIDE for MCP Apps UI resources

| STRIDE                 | Threat                                       | Impact               | Mitigation                                       | Testable control                     |
| ---------------------- | -------------------------------------------- | -------------------- | ------------------------------------------------ | ------------------------------------ |
| Spoofing               | UI impersonates host                         | Unauthorized actions | `postMessage` origin allowlist + nonce handshake | E2E test: reject untrusted origins   |
| Tampering              | UI modifies tool-call payloads               | Unauthorized actions | JSON schema validation + method allowlist        | Unit test: reject malformed payloads |
| Repudiation            | No record of approval events                 | Audit failure        | Immutable audit log with approval entries        | Log integrity test                   |
| Information Disclosure | UI exfiltrates data                          | Data leakage         | Strict CSP default; no external origins          | CSP test: block external network     |
| Denial of Service      | UI spams host or tool calls                  | Host instability     | Rate limits + size caps                          | E2E test: rate-limit enforcement     |
| Elevation of Privilege | UI triggers privileged tools without consent | Policy breach        | Explicit user approval gate                      | UI approval-flow test                |

### Audit log schema (minimum)

```json
{
  "event_id": "evt_...",
  "timestamp": "2026-02-01T00:00:00Z",
  "tenant_id": "tenant_123",
  "user_id": "user_456",
  "source": "mcp-ui",
  "action": "tool_call",
  "tool_name": "pr_gate.dashboard",
  "tool_args": { "pr_id": "PR-123" },
  "approval": {
    "required": true,
    "approved": true,
    "approver_id": "user_456",
    "reason": "Reviewed and approved"
  },
  "ui_resource_hash": "sha256:...",
  "rpc_id": "rpc_789",
  "prev_hash": "sha256:...",
  "hash": "sha256:..."
}
```

### Integrity hashing approach

- Canonicalize JSON with stable key ordering.
- Compute `hash = sha256(canonical_json + prev_hash)`.
- Store `prev_hash` as the hash of the prior entry to maintain a chain.

### Break-glass policy

- Break-glass requires dual approval (Security + Platform lead).
- Break-glass is time-boxed and logged with expiration.
- Break-glass usage is reported in `artifacts/ci/override_log.json`.

## Deterministic evals and evidence

### Determinism requirements

- Set `SUMMIT_SEED=1` for all test runs.
- Set `SOURCE_DATE_EPOCH` to the commit timestamp.
- Disallow network calls in required CI lanes.
- Require stable JSON canonicalization for transcript snapshots.

### Assistants to Responses migration evals

- Validate request schemas for `OpenAIResponsesAdapter`.
- Validate tool-call loop steps and tool parameters.
- Validate truncation/summarization outputs for Summit-managed mode.

### MCP Apps UI e2e tests

- UI resource fetch and render inside a test host shell.
- JSON-RPC handshake and message exchange.
- CSP enforcement and network denial for unapproved origins.
- Approval gate enforcement for privileged actions.

### Evidence artifacts

- `artifacts/evidence/<EVID...>/report.json`
- `artifacts/evidence/<EVID...>/metrics.json`
- `artifacts/evidence/<EVID...>/stamp.json`

## Operations runbook (condensed)

### Assistants denylist scanner gate

- Implement `tools/ci/denylist_openai_assistants.py`.
- Gate in CI with `denylist-openai-assistants` job.
- Override label `override/assistants-temp` requires dual approval and an expiry timestamp.

### Observability

- `openai.responses.request.count`
- `openai.responses.error.count`
- `openai.responses.latency.ms`
- `openai.assistants.api.call.count`
- `mcp.ui.render.count`
- `mcp.ui.approval.required.count`
- `mcp.ui.approval.denied.count`

### summit-mcp deployment

- Internal network first; mTLS or JWT auth.
- Rate limit per tenant and per host.
- MVP is read-only tools; approvals required for action tools.

### Rollback

- Disable MCP server via feature flag.
- Revoke host credentials and blocklist host IDs.
- Revert to read-only toolset if action tools were enabled.

## Product roadmap (condensed)

### MVP

- Responses adapter with Summit-managed conversation mode.
- Denylist gate blocking new Assistants usage.
- MCP Apps read-only PR-gate dashboard.

### Phases

1. Foundation: gateway + adapter + denylist gate.
2. Hardening: deterministic evals + audit integrity.
3. GA readiness: remove Assistants code paths and enforce policy defaults.

### Success metrics

- Responses migration coverage >= 80% by pilot completion.
- Zero Assistants usage detected post-gate.
- MCP PR-gate dashboard adoption > 30% of active reviewers in 60 days.

## Governance posture

- All runtime decisions are evidence-backed and recorded in the provenance ledger.
- All deviations from default policy are recorded as Governed Exceptions.
- All implementation changes align to readiness authority files.

## End state

Summit operates on a provider-agnostic LLM gateway with Responses as the default provider, a deterministic tool runtime, and a governed MCP Apps UI surface for interactive operations.
