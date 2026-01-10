# Agentic Security & Governance Playbook

This guide codifies bounded autonomy for Summit agent networks: default-deny policies, opaque secret handling, and full provenance.

## Principles

- **No raw secrets to LLMs**: Only opaque handles or redacted values reach prompts.
- **Policy-first execution**: All tool calls pass through OPA decisions; default deny.
- **Receipts and provenance**: Every decision/tool call emits an auditable receipt linked to the provenance ledger.
- **Least privilege**: Scopes, TTLs, and rate limits on tools, handles, and channels.
- **Prompt integrity**: Every agent task must reference a registered prompt hash and task contract.

## Secret-handles flow

1. Agent requests a secret handle from the **secret-handle broker** with scope + TTL.
2. Broker returns `handle://<id>`; the handle references encrypted material stored server-side.
3. Tool adapters resolve handles server-side, never exposing raw secret to the LLM channel.
4. Access is logged with actor, tool, purpose, policy decision, and expiry.

### Handle schema

- `handle_id`: Unique opaque ID.
- `scope`: Tool/agent scope.
- `ttl_seconds`: Expiry.
- `created_by`: Actor/agent.
- `policy_decision_id`: Reference to OPA decision.
- `audit_ref`: Pointer to provenance record.

## Redaction

- Deterministic redaction filters applied before prompts: PII, credentials, tokens.
- Filters run in adapters; failures trigger `redaction_block` failure code.
- Redacted fields keep structural markers for traceability.

## OPA enforcement

- Tool adapters call OPA with context `{agent_id, tool_id, capability_contract, intent, channel}`.
- Default deny; allow requires explicit policy.
- Decision records are attached to receipts and stored in provenance ledger.

## Capability receipts

- Each tool call produces a signed receipt containing: `agent_id`, `tool_id`, `capability_contract`, `policy_decision_id`, `handle_ids`, `timestamp`, `budget_usage`.
- Receipts must be validated before tool execution; rejected receipts block the call.

## Failure taxonomy (security-relevant)

- `policy_denied`: OPA decision blocks call.
- `redaction_block`: Redaction failed or unsafe content detected.
- `budget_exceeded`: Token/time/financial ceiling crossed.
- `handle_invalid`: Secret handle missing/expired/mismatched scope.
- `interop_error`: External agent/tool bridge failed validation.

## Observability requirements

- Emit spans for every policy check, redaction, receipt issuance, and handle resolution.
- Attach budget consumption, token counts, and channel type (NL/control) to spans.
- Ship audit logs to the provenance ledger with retention ≥90 days.

## Governed Exceptions

- Legacy bypasses are permitted only as **Governed Exceptions** with explicit owner, scope, TTL, and policy annotation.
- Every exception must be recorded in the network spec `governance.governed_exceptions` and linked to a provenance record.
- Exceptions are default-deny after TTL expiry and require re-approval through policy-as-code changes.

## Prompt and task integrity

- Agents must reference immutable prompt hashes from `prompts/registry.yaml`.
- Each agent task must conform to `agents/task-spec.schema.json` and be stored alongside the network spec.
- Prompt hash, task spec, and policy bundle versions are included in every receipt for auditability.

## External agent/tool interop

- Require signed capability manifests from foreign agents; verify signatures before allowing access.
- Translate protocols via adapters; never bypass policy or redaction.
- Use scoped tokens issued per session with expiry and trace IDs.

## Testing & validation

- Schema validation for network specs must include security defaults (default-deny, required receipts, redaction rules present).
- Add unit tests for handle issuance/expiry, redaction patterns, and policy-denied paths.
- Golden trace replay must assert policy decisions and receipts remain stable over time.
