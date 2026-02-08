# Summit Switchboard Positioning + Architecture (v0.1)

## Evidence Bundle (UEF)
- Scope: Summit Switchboard public identity, control-plane/data-plane boundary, and v0.1
  architecture modules aligned to governance/provenance requirements.
- Authority files: `docs/SUMMIT_READINESS_ASSERTION.md`, `docs/governance/CONSTITUTION.md`,
  `docs/governance/META_GOVERNANCE.md`, `docs/governance/AGENT_MANDATES.md`.
- Applicable components:
  - Control plane: Summit Switchboard (policy + provenance + routing)
  - Data plane: Agent Switchboard (Redis Streams + MCP fabric)
  - Tool plane: Summit MCP Server (tool exposure only)
- Outcome: Publish a collision-safe identity, explicit boundaries, and a control-plane
  architecture that integrates proxy mechanics with Summit policy/provenance standards.

## Summit Readiness Assertion (Escalation)
This positioning and architecture are bound to the readiness posture in
`docs/SUMMIT_READINESS_ASSERTION.md` and must remain aligned with its absolute readiness
requirements.

## Public Identity (Collision-Safe)
- **Public brand:** **Summit Switchboard** (never “Switchboard” standalone).
- **Package naming:** `@summit/switchboard` or `summit-switchboard` (public).
- **CLI:** `summit-switchboard` (public); `switchboard` alias **only** in internal/dev mode.
- **Marketplace listing title/tagline:**
  - “Summit Switchboard — MCP Server Automation & Orchestration (control plane)”
- **Naming collision disclaimers:**
  - Not affiliated with Pipedream “Switchboard MCP Server” (content creation platform).
  - Not affiliated with the `george5562` Switchboard proxy (proxy mechanics may be
    incorporated, but Summit Switchboard is a policy/provenance control plane).

## Boundary Definition (Control Plane vs Data Plane vs Tool Plane)
| Component | What it is | What it is not |
| --- | --- | --- |
| **Summit MCP Server** | Tool-exposing MCP server for Summit actions/models. | Not an orchestrator. |
| **Summit Switchboard (control plane)** | Discovers MCP servers, selects by capability, configures credentials, validates health, routes tool calls, and enforces policy/provenance. | Not a message bus. |
| **Agent Switchboard (data plane)** | Redis Streams + MCP as a durable, observable agent communication fabric (consumer groups, acks, logs). | Not config/credential automation. |

## Architecture (Control Plane)
Summit Switchboard composes a **policy + provenance** control plane on top of proven MCP
proxy mechanics (suite tools, lazy spawn, introspect/call routing, token reduction).

### Core Modules
1. **Registry + Capability Catalog**
   - Ingest `.mcp.json`, IDE locations, and remote MCP endpoints.
   - Normalize to a capability schema (verbs/resources/auth requirements).
2. **Policy & Identity (OPA/ABAC-first)**
   - Preflight: can this agent use this MCP + tool + scope?
   - Policy-gated credential issuance and scoped rotation.
3. **Tool Surface Manager**
   - Suite-tool grouping + lazy subtool expansion to minimize tool-flooding.
   - Policy-driven redaction: hide tools the caller cannot use.
4. **Health + Lifecycle**
   - Validate MCP server health before routing.
   - Restart/quarantine/backoff with SLO metrics.
5. **Provenance Ledger**
   - Emit signed receipts for every route/config/credential/call.
   - Export evidence bundles for audits and partner installs.
6. **Learning + Optimization**
   - Historical routing outcomes: success rate, latency, token cost, failure modes.
   - Preferred-server suggestions per capability.

## Table Stakes vs Differentiators
**Copy fast (baseline proxy mechanics):**
- `.switchboard/mcps/*/.mcp.json` migration.
- Lazy child initialization.
- Suite tool per MCP + introspect/call envelope.
- Description summarization/token reduction.

**Differentiate (Summit control-plane value):**
- Policy simulation/preflight **before** enabling any MCP.
- Credential brokering (scoped, rotated, environment-bound).
- Receipts & audit trails for every sensitive action.
- Multi-tenant isolation + per-tenant cost attribution.

## Repo Mapping (Initial)
- **Switchboard console CLI:** `apps/switchboard-console/`.
- **Switchboard web console (HITL):** `apps/switchboard-web/`.
- **Switchboard blueprint docs:** `docs/modules/switchboard-blueprint.md`.
- **Switchboard UI docs:** `docs/ui/switchboard.md`.
- **Control-plane policy:** `policies/switchboard.rego`.
- **Control-plane API contract:** `apis/switchboard.yaml`.

## Acceptance Tests (v0.1)
1. **Identity collisions mitigated**
   - Public docs always reference “Summit Switchboard”.
   - CLI defaults to `summit-switchboard` and warns on `switchboard` alias outside dev.
2. **Policy preflight**
   - Attempting a tool call without ABAC approval returns deterministic deny reasons.
3. **Credential brokering**
   - Issued credentials are scope-bound and audited with receipts.
4. **Health gating**
   - Unhealthy MCP servers are quarantined before routing.
5. **Provenance receipts**
   - Every route/config/credential/call emits a signed receipt.

## Governance & Compliance Hooks
- **Decision Reversibility:** document rollback triggers and steps for each automation.
- **Evidence-first output:** emit evidence bundles for policy decisions and receipts.
- **Policy-as-code:** all regulatory logic must remain in policy engine.

## MAESTRO Threat Modeling Alignment
- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered:** tool abuse, prompt injection, credential exfiltration, policy bypass,
  compromised MCP servers, poisoned capability catalog, audit log tampering.
- **Mitigations:** ABAC preflight, scoped credentials with rotation, health gating + quarantine,
  deterministic routing logs with signed receipts, evidence bundle exports, and SLO monitoring.

## Next Actions (Directed)
1. Publish the collision-safe name rules in public READMEs and marketplace listings.
2. Implement control-plane policy preflight + credential brokering.
3. Wire suite-tool grouping + lazy expansion and enforce policy redaction.
4. Emit signed receipts for every route/config/credential/call.
5. Ship v0.1 acceptance tests and evidence bundle output.

## Status
Intentionally constrained to v0.1 scope. Execution continues under Summit governance and
readiness mandates.
