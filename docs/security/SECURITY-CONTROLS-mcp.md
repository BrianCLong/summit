# MCP Security Controls & Test Mapping

## Summit Readiness Assertion

Reference: `docs/SUMMIT_READINESS_ASSERTION.md`. This control plan is bound to readiness gates and uses governed exceptions only when explicitly recorded.

## Control Objectives

1. Deny-by-default MCP server/tool access.
2. Explicit, auditable consent for tool calls and sampling.
3. Deterministic, evidence-grade auditability.
4. UI sandbox integrity for MCP Apps.
5. Residency-aware data boundaries and egress controls.

## MAESTRO Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered:** malicious servers, tool poisoning, sampling abuse, UI sandbox attacks, supply-chain compromise.
- **Mitigations:** policy-as-code allowlisting, schema validation, consent gating, sampling disablement by default, iframe sandbox/CSP enforcement, immutable audit logging.

## Policy-as-Code Design (rego or equivalent)

### Policy Domains

- **Registry Allowlisting:** only signed manifests from approved registries.
- **Tool Scopes:** per-tool read/write/delete scopes by data classification.
- **Egress Rules:** per-tenant and per-region allowlists.
- **Sampling Approvals:** disabled by default; explicit opt-in required.

### Decision Inputs

- Tenant ID
- Tool descriptor (schema + declared scopes)
- Data classification
- Egress destination
- Session consent token + TTL

### Decision Outputs

- `allow` / `deny`
- Required consent prompts
- Audit event schema
- Quarantine triggers

## Controls → Tests → Gates Mapping

| Control               | Implementation Surface     | Evidence/Tests                                        | CI Gate              |
| --------------------- | -------------------------- | ----------------------------------------------------- | -------------------- |
| Deny-by-default       | SMCP registry + SMG policy | `tests/regression/mcp_policy_deny_by_default.test.ts` | `ci:policy`          |
| Manifest signing      | SMCP manifest validator    | manifest signature tests                              | `ci:policy`          |
| Schema validation     | mcp-core validation        | conformance suite                                     | `ci:mcp-conformance` |
| Consent enforcement   | SAR consent APIs           | consent regression tests                              | `ci:security-agent`  |
| Sampling disablement  | SMG sampling guard         | sampling exfil tests                                  | `ci:security-agent`  |
| UI sandbox & CSP      | UI Host + ui:// proxy      | CSP + origin spoof tests                              | `ci:e2e-ui`          |
| Immutable audit log   | Audit service              | append-only integrity tests                           | `ci:security-agent`  |
| Residency enforcement | SMG routing policy         | residency rule tests                                  | `ci:policy`          |

## Onboarding Checklist for MCP Servers (Mandatory)

1. **Registry Entry**: signed manifest, owner, and risk tier.
2. **Policy Scope**: declared tools with read/write/delete classification.
3. **Residency**: region-local execution confirmed.
4. **Egress**: allowlist and domain inventory attached.
5. **Consent UX**: user-facing description vetted.
6. **Security Review**: threat model delta recorded.
7. **Evidence**: test runs captured as evidence artifacts.
8. **Rollback Plan**: kill-switch + quarantine procedure linked.

## Copilot SDK Adapter Controls (Optional Integration)

- Adapter must re-apply Summit policy checks before any tool invocation.
- Copilot SDK cannot expand the tool surface beyond Summit allowlists.
- Process isolation required; no ambient credentials.

## Audit & Evidence Requirements

- Append-only audit log with tenant partitioning.
- Evidence artifacts include report/metrics/stamp with deterministic seed.
- Decision reversibility documented with rollback triggers.

## Governance & Exceptions

- Any exception is recorded as a **Governed Exception** with expiry.
- DecisionLedger entries are mandatory for compliance-sensitive changes.

## Security Review Cadence

- Quarterly review or on MCP spec update.
- Immediate review after any policy change or new MCP Apps surface.
