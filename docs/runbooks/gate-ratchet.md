# Gate Ratchet Switchboard Runbook

## Overview
The **Gate Ratchet Switchboard** is a mechanism to safely promote CI gates from "Report Only" to "Required" based on proven stability metrics. It eliminates "flaky gate" fatigue by ensuring that a gate is only made blocking when it is reliable.

**Configuration:** `ci/gate-ratchet.yml`
**Metrics:** `dist/ci/gates/*.summary.json`
**Reports:** `dist/ci/gate-stability-report.md`

## Workflow

1.  **Define Gate:** Add a new gate to `ci/gate-ratchet.yml` with status `report_only`.
2.  **Collect Metrics:** The CI runs generate summary artifacts.
3.  **Analyze Stability:** Run `scripts/ci/analyze_gate_stability.ts` to view pass rates and flake stats.
4.  **Promote:** Use `scripts/ci/ratchet_propose.ts` to automatically update the config when criteria are met.

## How to Interpret Metrics

The stability report (`dist/ci/gate-stability-report.md`) shows:

*   **Pass Rate:** Percentage of successful runs. Target: >98% for blocking gates.
*   **Streak:** Number of consecutive green runs. Target: >10-20.
*   **Flake/Retry %:** Frequency of retries or quarantine usage. Target: <2%.
*   **P95 Duration:** The 95th percentile runtime.

## Promotion Criteria

Each gate in `ci/gate-ratchet.yml` defines its own promotion criteria:

```yaml
promotion_criteria:
  min_consecutive_green: 10
  min_pass_rate_percent: 98
  max_flake_retry_percent: 2
  max_duration_seconds_p95: 300
```

## Commands

### Check Gate (CI)
Wraps a command and enforces the gate status.
```bash
./scripts/ci/check_gate.ts --gate-id <id> --command "<cmd>"
```

### Analyze Metrics
Generates a stability report from a directory of summary JSONs.
```bash
./scripts/ci/analyze_gate_stability.ts --dir dist/ci/gates
```

### Propose Promotions
Analyzes metrics and updates `ci/gate-ratchet.yml` if criteria are met.
```bash
./scripts/ci/ratchet_propose.ts
```

### Validate Config
Ensures the YAML is valid.
```bash
./scripts/ci/validate_gate_ratchet.ts
```

## Handling Regressions

If a **Required** gate starts failing or flaking:

1.  **Demote to Report Only:** Manually edit `ci/gate-ratchet.yml` and set `status: report_only`.
2.  **Fix the Root Cause:** Investigate logs and fix the test/check.
3.  **Wait for Stability:** Let the gate run in `report_only` mode until it meets the promotion criteria again.
4.  **Re-Promote:** Run `ratchet_propose.ts` or manually set back to `required`.
