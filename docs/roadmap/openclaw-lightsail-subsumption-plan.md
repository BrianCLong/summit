# Summit Subsumption Engine v2 Plan

## ITEM: OpenClaw on Amazon Lightsail

- ITEM URL: <https://aws.amazon.com/blogs/aws/introducing-openclaw-on-amazon-lightsail-to-run-your-autonomous-private-ai-agents/>
- ITEM type: Cloud deployment pattern + agent runtime
- Summit Readiness Assertion: this plan converts deployment novelty into governed, auditable, deterministic Summit primitives.

## 1.0 ITEM Summary

AWS Lightsail now provides a preconfigured path to run OpenClaw as a self-hosted autonomous agent runtime with browser pairing, messaging integration, and Bedrock-backed model access. Summit should subsume the deployment pattern and operational lessons into governed runtime verification and policy-gated execution.

## 1.1 Ground Truth Capture (ITEM claims)

- `ITEM:CLAIM-01`: OpenClaw is an open-source, self-hosted, autonomous private AI agent.
- `ITEM:CLAIM-02`: OpenClaw runs on a local machine or server.
- `ITEM:CLAIM-03`: User interaction is browser-based.
- `ITEM:CLAIM-04`: OpenClaw can connect to WhatsApp, Discord, and Telegram.
- `ITEM:CLAIM-05`: OpenClaw can manage email, browse the web, and organize files.
- `ITEM:CLAIM-06`: Lightsail provides a preconfigured OpenClaw deployment.
- `ITEM:CLAIM-07`: The Lightsail flow integrates with Amazon Bedrock for model access.
- `ITEM:CLAIM-08`: OpenClaw is instruction-following with autonomous task execution.

## 1.2 Claim Registry

| Planned Summit Feature         | Source          |
| ------------------------------ | --------------- |
| Agent execution sandbox        | CLAIM-01        |
| Browser-based agent control    | CLAIM-03        |
| Messaging-based agent triggers | CLAIM-04        |
| Tool-execution pipelines       | CLAIM-05        |
| Cloud agent instance templates | CLAIM-06        |
| Model backend abstraction      | CLAIM-07        |
| Autonomous task planning       | CLAIM-08        |
| Security-audited agent runtime | Summit original |

## 1.3 Strategic Subsumption

Summit does **not** clone OpenClaw. Summit subsumes three governed primitives:

1. Agent Runtime Verification: reproducible, auditable runs.
2. Agent Capability Registry: explicit permission contracts per tool.
3. Agent Infrastructure Recipes: portable cloud deployment templates.

## 1.4 Minimal Winning Slice (MWS)

Summit can reproducibly launch and verify a sandboxed autonomous agent instance and emit auditable deterministic traces.

### Acceptance tests

- `tests/agent/test_agent_runtime.py`
  - launch validation
  - tool execution validation
  - deterministic trace generation
  - policy enforcement

### Required evidence artifacts

```text
artifacts/
  agent-run/
    report.json
    metrics.json
    stamp.json
```

## 1.5 Repo Reality Check (to be validated in implementation PRs)

Target repository: `BrianCLong/summit`

Validation checklist:

- verify CI pipeline names used for gating
- verify evidence schema and canonical serialization contracts
- verify Python/TypeScript module boundary for runtime components
- verify standards docs location
- verify security docs path for data-handling controls

## 1.6 PR Stack (max 6)

1. `feat(agent): sandboxed autonomous agent runtime`
2. `feat(agent): capability registry`
3. `feat(agent): deterministic trace recorder`
4. `feat(infra): agent deployment template`
5. `feat(security): agent execution policy engine`
6. `feat(ci): agent runtime verification gates`

## 1.7 Threat-Informed Requirements

| Threat           | Mitigation                                 | Gate                 |
| ---------------- | ------------------------------------------ | -------------------- |
| Malicious plugin | capability registry + signed allowlist     | plugin audit         |
| Shell injection  | policy engine deny-by-default shell policy | runtime policy check |
| Prompt injection | trace analyzer + policy regression tests   | security test suite  |
| Token exhaustion | tool budget and max step limits            | budget monitor       |

## 1.8 MAESTRO Security Alignment

- **MAESTRO Layers**: Agents, Tools, Infrastructure, Observability, Security.
- **Threats Considered**: goal manipulation, prompt injection, tool abuse, unauthorized egress.
- **Mitigations**: capability gating, deterministic trace evidence, policy-as-code checks, anomaly monitoring.

## 1.9 Performance and Cost Budgets

- agent planning latency: `< 2s`
- trace generation latency: `< 50ms`
- runtime memory envelope: `< 512MB`

## 1.10 Data Handling Controls

Never log:

- API keys
- user credentials
- messaging tokens
- file paths outside allowed workspace roots

Retention baseline:

- traces: 30 days
- metrics: 90 days

## 1.11 Operational Readiness

- Runbook target: `docs/ops/runbooks/agent_runtime.md`
- Alerts: `agent-run-failure`, `policy-violation`, `trace-corruption`
- SLO: agent execution success `>= 99%`

## 1.12 Definition of Done

- Determinism score: 5/5
- Machine-verifiable score: 5/5
- Mergeability score: 4/5
- Security posture score: 5/5
- Measured advantage score: 4/5
- Total: 23/25 (PASS)

## 1.13 Convergence Protocol

Execution order: research -> architecture -> security -> implementation -> verification.

Conflict rule: the master subsumption plan is authoritative; role agents submit diffs only.

## 1.14 Finality

OpenClaw validates that adoption accelerates around deployment patterns, not framework novelty. Summit therefore proceeds with **verifiable agent infrastructure** as the governed endpoint.
