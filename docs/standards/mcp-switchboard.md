# Summit Switchboard (MCP) Standard

## Purpose
Summit Switchboard (MCP) is a governed MCP meta-orchestrator that automates discovery, configuration,
and health-checking of allowlisted MCP child servers while exposing a token-efficient aggregated tool
surface with lazy subtool expansion. This standard explicitly disambiguates Summit Switchboard (MCP)
from the existing Summit ingestion “Switchboard” that performs event ingestion, normalization,
deduplication, enrichment, and routing.

## Readiness Assertion
This standard is governed by the Summit Readiness Assertion and must remain consistent with the
Constitution of the Ecosystem and the Meta-Governance Framework.

## Scope
- Control-plane automation for MCP child server discovery, configuration, and health gating.
- Aggregated tool surface with suite tools and lazy subtool expansion.
- Optional durable orchestration events via Redis Streams (bus), without conflating with ingestion
  Switchboard.

## Non-Goals
- Not a general-purpose model router.
- Not a broadcast/email platform MCP server.
- Not a replacement for Summit’s ingestion Switchboard.

## Naming & Disambiguation
- Code paths MUST use `switchboard_mcp`.
- Docs MUST use “Summit Switchboard (MCP)”.
- The ingestion Switchboard retains its existing name and scope.

## Claim Registry (Traceability)
- **ITEM:CLAIM-01**: MCP Switchboard orchestrates MCP servers.
- **ITEM:CLAIM-02**: Select/configure/health-check behaviors.
- **ITEM:CLAIM-03**: Aggregation with suite tools + lazy expansion.
- **ITEM:CLAIM-04**: Token reduction must be measured by Summit harness (no external claims).
- **ITEM:CLAIM-05**: Optional Redis Streams durable bus.
- **SUMMIT:CLAIM-06**: Existing Switchboard = ingestion pipeline.
- **SUMMIT:CLAIM-07**: MIT license; clean-room implementation required.

## Minimal Winning Slice (MWS)
Summit Switchboard (MCP) reads an allowlisted config, spawns child MCP servers without shell
execution, exposes one suite tool per child with lazy subtool expansion, and produces deterministic
artifacts for CI evidence.

### Acceptance Tests
1. `tools/list` returns only suite tools when lazy mode is enabled.
2. `tools/call` on a suite tool with `op=list_subtools` returns child tools (cached, size-limited).
3. Deny-by-default: calling an unconfigured child/tool fails with a structured error.
4. Health-check gate: unhealthy child prevents routing.
5. Redaction: logs never include secrets; snapshot test on redaction.

### Deterministic Artifacts
- `artifacts/switchboard-mcp/report.json`
- `artifacts/switchboard-mcp/metrics.json`
- `artifacts/switchboard-mcp/stamp.json` (content-hash + schema version only)

## Guardrails
- Feature-flag OFF by default: `SWITCHBOARD_MCP_ENABLED=false`.
- Deny-by-default execution; only allow configured child servers.
- No arbitrary process spawning; allowlist binaries/entrypoints, no shell execution.
- Clean-room implementation (ideas-only), no external code copying.

## Interop Matrix
- **Imports:** allowlisted `.mcp.json`-style configs; environment variables for credentials; optional
  Redis connection string.
- **Exports:** MCP server endpoint (stdio/http per Summit norms); metrics JSON; evidence report JSON.

## Performance Budgets (Initial)
- `tools/list` response size (lazy): ≤ 50 KB.
- `list_subtools` per child: ≤ 200 tools (hard cap; return `truncated: true`).
- Spawn time per child: warn at 2s, fail health gate at 5s.

## Threat-Informed Requirements
| Threat | Mitigation | Gate | Test |
| --- | --- | --- | --- |
| Config spawns arbitrary processes | Allowlist binaries/entrypoints, no shell, absolute paths only | Config validation fails CI/runtime | Reject injection fixture (`; rm -rf`) |
| Secret leakage in logs/artifacts | Centralized redaction + never-log list | Snapshot + grep gate | Log serializer redaction snapshot |
| Tool-surface prompt injection | Sanitize/clip descriptions, deterministic summarizer, max length | Max-length assertions | Oversized tool description shrunk |

## MAESTRO Alignment
- **MAESTRO Layers:** Agents, Tools, Infra, Observability, Security.
- **Threats Considered:** prompt injection, tool abuse, config tampering, secret exfiltration.
- **Mitigations:** allowlisted config, deny-by-default routing, deterministic summarizer, redaction.

## Positioning
“Summit Switchboard (MCP): MCP server automation + aggregated tool surface for multi-agent systems.”
Token savings must be measured by Summit’s harness before public claims.

## Roll-Forward / Rollback
- **Roll-forward:** enable via config + allowlist in staging.
- **Rollback:** remove config + disable flag.

## Evidence-First Compliance
All outputs must be deterministic and auditable. Evidence artifacts are required for CI gates and
post-deploy accountability.
