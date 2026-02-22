# Runbook: Summit S-ADK (IBM ADK Workflow Shape)

## Purpose
Operate the Summit Agent Development Kit (S-ADK) local workflow for deterministic
agent development and evidence generation.

## Quick Start
1. `summit adk init --name demo_agent`
2. `summit adk validate demo_agent/agent.yaml`
3. `summit adk run demo_agent --fixture demo_agent/fixtures/minimal.json`
4. `summit adk pack demo_agent`

## Common Failure Modes
- **Schema Validation Failure**: `summit adk validate` returns non-zero.
  - Fix manifest fields to match `s-adk/v1`.
- **Determinism Mismatch**: Evidence digests differ across runs.
  - Verify fixtures are unchanged and manifests are stable.
- **Tool Deny Gate**: Tool calls are blocked.
  - Add allowlist entries and set `S_ADK_UNSAFE_TOOLS=1` for explicit runs.
- **Secret Scan Failure**: `summit adk pack` fails on `.env` or secret-like tokens.
  - Remove secrets and re-run.

## Alerting Hooks
Deferred pending integration with Summit alerting pipelines.
