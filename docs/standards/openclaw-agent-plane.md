# OpenClaw-Class Agent Plane for Summit (Governed Subsumption Standard)

## 1) Strategic Position

Summit subsumes the deployment pattern proven by “OpenClaw on Amazon Lightsail” without inheriting its permissive trust defaults.

- **What we adopt:** packaged deployment ergonomics, gateway-style control plane, channel-ready architecture.
- **What we change:** deny-by-default capabilities, deterministic evidence, policy-gated execution, and audit-first operations.

## 2) Grounded Claims (ITEM → Summit mapping)

| ITEM claim theme | Summit design implication |
| --- | --- |
| Preconfigured cloud deployment + browser pairing flow | Provide reproducible deployment recipe and browser-first operator control path |
| Self-hosted autonomous runtime model | Implement bounded autonomous runtime behind feature flag |
| Optional messaging integrations | Stage channel adapters after security and evidence controls |
| Model backend integration (e.g., Bedrock) | Keep provider abstraction with explicit policy envelopes |

## 3) Reverse-Engineered OpenClaw Architecture (normalized)

```text
Ingress (browser/chat)
  -> Gateway (sessions/channels/events)
  -> Agent loop (plan/select tools)
  -> Execution layer (tools/files/apis)
  -> Model backend
  -> Persistence/ops
```

### Summit subsumption decision

- Preserve gateway decomposition.
- Replace permissive tool execution with capability broker + sandbox executor.
- Make evidence generation mandatory for each action edge.

## 4) Target Summit Architecture

```text
Ingress -> Normalize -> Content Trust Gate -> Planner
       -> Capability Broker -> Sandbox Executor
       -> Evidence Sink -> Review Surface / Export
```

### Core modules (proposed)

- `agents/openclaw_plane/control-plane/*`
- `agents/openclaw_plane/capabilities/*`
- `agents/openclaw_plane/sandbox/*`
- `agents/openclaw_plane/evidence/*`
- `agents/openclaw_plane/security/*`

## 5) Minimal Winning Slice (MWS)

Summit can run a bounded autonomous task in a workspace-scoped sandbox and emit deterministic evidence artifacts.

### Required artifacts per run

- `artifacts/agent-runs/<run-id>/report.json`
- `artifacts/agent-runs/<run-id>/metrics.json`
- `artifacts/agent-runs/<run-id>/stamp.json`
- `artifacts/agent-runs/<run-id>/events.ndjson`
- `artifacts/agent-runs/<run-id>/policy_decisions.json`

## 6) Threat-Informed Controls

| Threat | Mitigation | Gate / test intent |
| --- | --- | --- |
| Prompt injection | Content trust gate + source labeling | `agent-content-trust` |
| Workspace escape | Canonical path jail | `agent-sandbox-jail` |
| SSRF / egress abuse | Allowlisted network egress | `agent-egress-policy` |
| Secret leakage | Evidence/log scrubber | `agent-log-scrub` |
| Runaway loops/cost | Step/token/time budgets | runtime kill-switch tests |
| Unsigned capability packs | Manifest schema + signature policy | `agent-manifest-verify` |

## 7) MAESTRO Security Alignment

- **MAESTRO Layers:** Agents, Tools, Data, Observability, Security, Infra.
- **Threats Considered:** prompt injection, tool abuse, privilege escalation, data exfiltration, cost exhaustion.
- **Mitigations:** deny-by-default capability registry, workspace jail, egress allowlist, deterministic evidence ledger, budget guardrails.

## 8) PR Stack (bounded to six)

1. Control-plane skeleton + feature flag default OFF.
2. Capability manifest schema and allowlist policy.
3. Sandbox executor + workspace jail.
4. Evidence writers + deterministic schema checks.
5. Content trust and egress policy enforcement.
6. Deploy recipe + drift monitoring + runbook/data handling.

## 9) Non-Goals

- No broad consumer assistant parity.
- No unrestricted shell execution in MWS.
- No third-party plugin marketplace in initial release.
- No bypass of existing governance or required checks.

## 10) Exit Criteria

A change is merge-ready only when it demonstrates:

1. deterministic fixtures,
2. schema-valid evidence outputs,
3. deny-by-default enforcement,
4. rollback via single feature flag,
5. additive blast radius.
