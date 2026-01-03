# Agent Network Spec (v0.1)

A declarative, versioned format for defining Summit multi-agent networks. Designed to be LLM-agnostic, governance-first, and compatible with foreign agents.

## Design goals

- **Governable**: Every tool call is policy-checked and emits a capability receipt.
- **Replaceable**: Agents/tools identified by capability contracts and versions.
- **Interoperable**: Supports external agents/tools via signed manifests and protocol adapters.
- **Traceable**: Run metadata links to provenance ledger and tracing spans.

## Top-level fields

- `version` (string, required): Spec version (e.g., `0.1.0`).
- `metadata` (object, required): `name`, `description`, `owner`, `labels`, `created_at`.
- `channels` (object): `natural_language` vs `control` routes for dual-channel coordination.
- `agents` (array, required): Agent definitions.
- `tools` (array): Tool adapters with policies.
- `policies` (array): References to OPA bundles/policy IDs.
- `workflows` (array, required): Ordered steps and transitions.
- `security` (object): Secret-handles config, redaction rules, and budget ceilings.
- `observability` (object): Trace IDs, log sinks, and sampling.

## Agent definition

- `id`: Unique agent ID.
- `role`: Human-readable purpose.
- `capability_contract`: Name + version of expected capabilities.
- `model`: Logical model route (LLM-agnostic) with performance class.
- `tools`: Allowed tool IDs with scopes and rate limits.
- `policies`: Policy refs enforced for this agent.
- `channels`: Which channels (NL/control) the agent uses.

## Tool definition

- `id`, `type` (internal | external), `adapter`, `capability_contract`.
- `policies`: Policy refs required before invocation.
- `secrets`: Required secret handles with scopes/TTL.
- `redaction`: Patterns applied before calls.
- `observability`: Span attributes emitted per call.

## Workflow definition

- `id`, `trigger` (event/user/system), `entry_agent`.
- `steps`: Ordered list with `agent`, `input`, `on_success`, `on_failure`, `guard_policy`.
- `handoffs`: Defines data passed between agents; sensitive fields must use secret handles.
- `escalations`: Conditions and target agents or humans.

## Security block

- `secret_broker`: Handle issuer/resolver service + TTL defaults.
- `redaction_rules`: Regex/structured patterns applied before LLM exposure.
- `budget`: Token/time ceilings per run and per agent.
- `capability_receipts`: Whether receipts are required and their signing key IDs.

## Observability block

- `trace`: Trace namespace, sampling, exporters, and required span attributes.
- `metrics`: Counters/histograms for tokens, latency, policy decisions, redactions, receipts.
- `logs`: Audit sink locations and retention.

## Validation

- Validate specs against a JSON Schema (store next to this doc).
- CI should run `scripts/validate-network-spec.ts path/to/spec.yaml` and fail on schema or guardrail violations.

## Example (see `examples/helpdesk-triage.yaml`)

```yaml
version: 0.1.0
metadata:
  name: helpdesk-triage
  description: Intake → retrieve context → decide → escalate
  owner: ops-team
  labels: [helpdesk, triage, ops]
  created_at: 2026-01-03T00:00:00Z
channels:
  natural_language: { transport: "message_bus", codec: "markdown" }
  control: { transport: "grpc", codec: "json" }
agents:
  - id: intake
    role: Collect user issue details and normalize intent
    capability_contract: intake.v1
    model: router://summit/default
    tools: [intent-normalizer]
    policies: [opa://tool-allowlist/intake]
    channels: [natural_language]
  - id: retriever
    role: Fetch KB and ticket history snippets
    capability_contract: retrieval.v1
    model: router://summit/default
    tools: [kb-search, ticket-search]
    policies: [opa://tool-allowlist/retriever]
    channels: [control]
  - id: decider
    role: Decide resolution vs escalation
    capability_contract: decision.v1
    model: router://summit/high-precision
    tools: [resolution-writer, escalation-router]
    policies: [opa://tool-allowlist/decider]
    channels: [natural_language, control]
tools:
  - id: kb-search
    type: internal
    adapter: graph-rag
    capability_contract: search.v1
    policies: [opa://tool-allowlist/search]
    secrets: []
    redaction: { patterns: [pii, secrets] }
    observability: { emit_spans: true }
  - id: escalation-router
    type: external
    adapter: external/agent-bridge
    capability_contract: escalation.v1
    policies: [opa://tool-allowlist/escalate]
    secrets: [handle://pagerduty-key]
    redaction: { patterns: [tokens] }
    observability: { emit_spans: true }
workflows:
  - id: triage
    trigger: user
    entry_agent: intake
    steps:
      - agent: intake
        on_success: retrieve
        on_failure: human_escalation
      - agent: retriever
        input: ${intake.output}
        on_success: decide
        on_failure: human_escalation
      - agent: decider
        input: ${retriever.output}
        on_success: resolve_or_escalate
    handoffs:
      - from: intake
        to: retriever
        fields: [issue_summary, user_id]
      - from: retriever
        to: decider
        fields: [kb_snippets, ticket_history]
    escalations:
      - condition: policy_denied || budget_exceeded
        target: human_escalation
security:
  secret_broker: { service: secret-handle-broker, default_ttl: 900s }
  redaction_rules: [pii, credentials]
  budget: { tokens: 12000, wall_time_ms: 20000 }
  capability_receipts: { required: true, signer: summit-root }
observability:
  trace: { namespace: agentic, sampling: 0.5, exporter: otlp }
  metrics: { tokens: true, latency_ms: true, policy_decisions: true }
  logs: { audit: s3://provenance-ledger/helpdesk, retention_days: 90 }
```
