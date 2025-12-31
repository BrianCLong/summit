# Operator Views (Read-Only, Safe)

Operator experiences must remain read-only and default-safe. This document describes required views and controls.

## Prediction Views

- **What is predicted:** Prediction class, horizon, target entity (service/tenant/connector), timestamp.
- **Why:** Top contributors, historical comparables, policy limits invoked, and trend deltas.
- **Confidence:** p50/p90 (or relevant) with calibration status and recent backtest metrics.
- **Limits:** Data gaps, disabled horizons, policy/guardrail denials, cost ceilings hit.
- **Evidence:** Inline links to raw metrics, policy bundle, pricing sheet, and replay token.
- **Recommended actions:** Non-binding guidance only (e.g., "add capacity", "pause connector", "review policy change").

## Controls

- **Disable per prediction class:** Feature flags (e.g., `predictions.capacity.enabled=false`).
- **Adjust horizons and thresholds:** Admins can lower horizons or raise thresholds; cannot extend beyond contract bounds.
- **Kill switch:** Global `predictions.global.disabled` toggle that fails all predictions closed.
- **Replay:** Button/CLI to recompute a past prediction using replay token.

## Delivery Channels

- **Console:** Read-only dashboard with drill-down to evidence links.
- **CLI:** `predictions get --class <id> --horizon <h> --entity <id>` with `--explain` flag.
- **Notifications:** Optional alerts to Slack/email with truncated summaries; full evidence requires console or CLI.

## Safety Defaults

- No autonomous actions triggered from operator view.
- Show policy and cost status prominently; hide values if policy denies access.
- Require explicit confirmation before enabling any automation hook.
