# Agent Telemetry Board

**Owner:** Summit GA Control Room
**Cadence:** On demand (minimum daily during GA window)
**Mode:** Evidence-first (UEF) → Summary
**Standards:** `docs/agents/agent-telemetry.md`

## 0. Evidence Bundle (UEF)

### Jules (Release Captain)

- Release gate artifacts: monitored through governance and release docs.
- Architecture/governance updates: tracked in documentation PR stream.

### Gemini CLI

- CI/test stabilization artifacts: monitored via workflow and check outputs.
- Failure clustering outputs: monitored via command center summaries.

### Antigravity

- Evidence and decision outputs: monitored in governance/evidence artifact paths.
- Tradeoff ledger updates: monitored in `governance/tradeoffs/tradeoff_ledger.jsonl`.

### Codex

- Architecture and ops docs updates: monitored in `docs/architecture/` and `docs/ops/`.
- PR explainers: monitored via PR comment/summary outputs.

## 1. Summary (Reasoning)

- Telemetry board is configured to aggregate artifacts across all active agent roles.
- Priority remains evidence completeness and owner-routed closure on every blocker.
- No cross-agent evidence gaps are flagged in this snapshot.

## 2. Operator Checklist

1. Confirm each agent has at least one fresh artifact in the reporting window.
2. Verify every blocker has an explicit owner and due date.
3. Escalate unresolved critical items to Release Captain immediately.

## 3. Required Links

- `docs/ops/GA_CONTROL_ROOM_AUTOMATIONS.md`
- `docs/agents/agent-telemetry.md`
- `docs/ops/GA_DAILY_STATUS_2026-02-08.md`
- `governance/tradeoffs/tradeoff_ledger.jsonl`
