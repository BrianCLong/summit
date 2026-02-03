# Summit AppOS: App Surfaces + MCP Compatibility (Summit-First Spec)

**Authority:** Summit AppOS Principal Architect (Codex)
**Alignment:** Summit Readiness Assertion + Governance Framework
**Scope:** Summit/Maestro interactive app surfaces rendered inside chat, with policy, evidence, and provenance

## 1) TEARDOWN (Anthropic → signals)

### UX loop: what’s new and why it matters

- **Interactive UI in chat** replaces text-only output with **actionable surfaces** (forms, previews, editable canvases) that keep users in the conversation while executing real tool actions.
- **Progressive disclosure** (preview → edit → commit) shortens the feedback loop and reduces tool switching, which increases conversion on multi-step workflows.
- **Paid-tier gating** makes the UI layer a premium productivity surface, not a developer-only feature.

### Protocol implications (MCP Apps)

- **MCP as transport + capability discovery** enables cross-client rendering using a common descriptor format.
- **App manifests** become a product distribution surface (directory model) and provide a capability envelope for tool access.
- **Cross-tool UX consistency** emerges when the client can render UI descriptors from multiple vendors.

### Safety model implied

- **Least privilege access** and close monitoring are required for embedded tools.
- **Permission boundaries** become the main safety rail for human-in-the-loop workflows.

### Competitive risk

- This expands Claude from “assistant” to **app shell** for enterprise tools, increasing stickiness and shifting the workflow center of gravity into the chat client.

## 2) SUMMIT “WE BEAT THEM” PRODUCT SPEC

### Narrative

Summit becomes the **Work Operating System** with **governance and evidence** as the moat: every action is **policy-gated**, **auditable**, **reversible**, and **linked to provenance**. This positions Summit as the only deployable platform that can render interactive tool UIs while meeting strict compliance requirements.

### Feature list

- **App Surfaces**
  - Render tool UI descriptors as first-class panels in chat.
  - Support embedded views, inline actions, and progressive disclosure flows.
  - Mobile-friendly fallback to summarized cards + deep links.
- **Agent + App coupling**
  - Plans render as surfaces; steps require explicit commits before execution.
  - Agent steps embed decision inputs (policy, approval, scope) in the surface.
- **Approval, policy, evidence, rollback**
  - OPA policy checks before every tool call.
  - Signed audit + evidence bundle for each action.
  - Dry-run simulation and compensating actions where supported.
- **Multi-tenant directory + admin**
  - Directory with per-tenant allowlists.
  - Admin review + scoped grants with expiry.
  - Usage telemetry and SLOs per tool.

### Example user journeys

1. **Slack announcement** → preview formatting → policy check → send.
2. **Figma frame update** → diff capture → approval → commit.
3. **Box file pull** → summarize → redact sensitive content → share link.
4. **Asana/Jira**: create epics/tasks from chat plan with approvals.
5. **Salesforce**: query object → generate report → step-up auth → push update.

## 3) ARCHITECTURE

### Components

- **App Surface Renderer (frontend)**: renders AppSurfaceDescriptor cards/panels in chat.
- **Tool Runtime / Broker (backend)**: handles tool calls, idempotency, and safety isolation.
- **Policy Engine (OPA-compatible)**: validates capability, scope, and data classification.
- **Evidence Bundler + Provenance Graph**: produces signed, immutable evidence bundle linked to chat/plan.
- **Connector Adapters**: MCP server ingestion + Summit-native connectors.

### Data flow (text diagram)

1. **Chat turn** → build **AppSurfaceDescriptor**.
2. **User action** → **ToolActionRequest**.
3. **Policy check** (OPA) → **allow/deny**.
4. **Execution** (Tool Broker) with idempotency key.
5. **Evidence bundle** + provenance link emitted.
6. **UI update** reflects draft/staged/committed state.

### State model

- **draft** → **staged** → **committed** → **rolled_back**.
- **denied** is a terminal state with evidence + policy rationale.

### Security boundaries + threat model

- **Prompt injection**: tool-returned instructions are labeled and isolated from system prompts.
- **Token theft**: per-tool scoped tokens with short TTL and tenant scoping.
- **Overbroad access**: deny-by-default permissions + explicit grants + expiry.

## 4) API CONTRACTS (PSEUDOSPEC)

```ts
export type AppSurfaceDescriptor = {
  id: string;
  title: string;
  summary?: string;
  renderMode: "card" | "panel" | "modal";
  schemaVersion: "v1";
  fields: Array<{
    id: string;
    label: string;
    type: "text" | "markdown" | "select" | "date" | "file" | "diff" | "chart";
    required?: boolean;
    value?: unknown;
    options?: Array<{ label: string; value: string }>;
  }>;
  actions: Array<{
    id: string;
    label: string;
    intent: "preview" | "stage" | "commit" | "rollback";
    policyScope: string[];
  }>;
  provenance: {
    chatTurnId: string;
    planStepId?: string;
  };
};

export type ToolActionRequest = {
  id: string;
  toolId: string;
  action: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  provenance: {
    chatTurnId: string;
    planStepId?: string;
    actorId: string;
  };
  requestedAt: string;
};

export type ToolActionResponse = {
  id: string;
  status: "ok" | "denied" | "error";
  result?: Record<string, unknown>;
  error?: { code: string; message: string };
  evidenceBundleId?: string;
  policyDecisionId?: string;
};

export type PolicyCheckRequest = {
  toolId: string;
  action: string;
  actorId: string;
  tenantId: string;
  dataClassification: "public" | "internal" | "restricted" | "secret";
  scope: string[];
  provenance: { chatTurnId: string; planStepId?: string };
};

export type PolicyDecision = {
  decisionId: string;
  allowed: boolean;
  rationale: string;
  obligations?: string[];
  stepUpAuth?: boolean;
};

export type EvidenceBundle = {
  id: string;
  createdAt: string;
  actorId: string;
  toolId: string;
  action: string;
  inputsHash: string;
  outputsHash?: string;
  policyDecisionId: string;
  provenance: { chatTurnId: string; planStepId?: string };
  signature: string;
};

export type ConnectorManifestIngestion = {
  source: "mcp" | "summit";
  toolId: string;
  version: string;
  capabilities: string[];
  uiSchema?: AppSurfaceDescriptor[];
  policyScopes: string[];
};
```

## 5) MVP PLAN (2–4 weeks) + GA PLAN (6–10 weeks)

### MVP scope (2–4 weeks)

- **Connectors**: Slack + Box (documents + preview).
- **Directory**: install/enable flow with per-tenant allowlist.
- **Policy checks**: OPA gating + deny-by-default.
- **Evidence**: minimal evidence bundle with provenance linkage.
- **UI**: App Surface Renderer + surface cards in chat.

### GA scope (6–10 weeks)

- **Connectors**: Slack, Box/Drive, Figma, Jira/Asana, Salesforce, plus 1–3 more.
- **Approval workflows**: optional two-person rule.
- **Step-up auth**: enforced for sensitive actions.
- **Rollback/undo**: compensating actions where supported.
- **Admin console**: multi-tenant controls + tool SLOs.
- **Performance**: rate limits, circuit breakers, idempotent retries.

## 6) TESTING + RELEASE GATES

- **Contract tests** per connector (schema + idempotency).
- **Security tests**: prompt injection simulation + permission escalation attempts.
- **E2E flows**: golden recordings for all MVP flows.
- **Release gates**:
  - Evidence bundle must be generated for every tool action.
  - Policy denies must never execute tool calls.
  - Load tests meet per-tool SLOs.

## Implementation Notes (Repo-Ready Skeleton)

### Proposed folders

- `apps/web/src/app-surfaces/` → renderer + surface components
- `server/src/app-surfaces/` → broker, surface registry, lifecycle
- `server/src/connectors/mcp/` → MCP manifest ingestion + adapters
- `server/src/policies/app-surfaces/` → OPA policy entry points
- `server/src/provenance/app-surfaces/` → evidence bundler + provenance links
- `packages/app-surfaces-types/` → shared TypeScript contracts

### Minimal skeleton interfaces

- Add `AppSurfaceDescriptor` + `ToolActionRequest/Response` to shared types.
- Implement a `SurfaceBroker` in `server/src/app-surfaces` with deterministic idempotency enforcement.
- Build `AppSurfaceCard` + `AppSurfacePanel` in `apps/web` to render typed UI surfaces.

## Governance Alignment

- All actions are **policy-as-code** gated and evidence-backed.
- Exceptions are **Governed Exceptions** with explicit audit trails.
- Readiness is asserted under the Summit Readiness Assertion and treated as absolute.
