# Risk Drift Detection and Early Warnings

`scripts/risk/detect-drift.ts` provides non-blocking drift detection that surfaces early warnings before regressions ship.

## Signals Monitored

- Rising average risk per PR compared to the previous window.
- Increasing exception counts or unclosed waivers.
- Agent risk trending upward (scope expansion, violations, debt ratio).
- Debt burn-down stalling or reversing.

## Operation

- Input: history file (JSON array) containing per-change scores, exception counts, agent metrics, and debt deltas.
- The script compares trailing windows (defaults: recent 10 vs prior 10) and emits warnings when thresholds are exceeded.
- Warnings are sent to CI logs and optionally to `--output` for downstream dashboards.

## Thresholds (defaults)

- **Risk average growth**: >10% relative increase.
- **Exception growth**: +3 open exceptions over prior window.
- **Agent risk growth**: >5 point increase in average agent subscore.
- **Debt stagnation**: non-negative debt delta over trailing window.

## Actions

- Warnings only (non-blocking) initially; can be promoted to blocking once stabilized.
- Signals instruct CI to surface guidance to agents (e.g., reduce scope, pay down debt).
- Governance team reviews warnings weekly and tunes weights/thresholds as needed.

## Evidence

All drift detections log contributing metrics and are preserved alongside the risk decision artifacts for auditability.
