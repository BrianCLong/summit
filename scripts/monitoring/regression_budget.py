#!/usr/bin/env python3
import sys

# Minimal script to track regression budget (time/cost)
MAX_CI_RUNTIME_MINUTES = 15
MAX_MONTHLY_COST_USD = 500

def check_budget(runtime_minutes, cost_usd):
    regressions = []
    if runtime_minutes > MAX_CI_RUNTIME_MINUTES:
        regressions.append(f"CI Runtime {runtime_minutes}m exceeds budget of {MAX_CI_RUNTIME_MINUTES}m")

    if cost_usd > MAX_MONTHLY_COST_USD:
        regressions.append(f"Cost ${cost_usd} exceeds budget of ${MAX_MONTHLY_COST_USD}")

    if regressions:
        print("REGRESSION BUDGET EXCEEDED:")
        for r in regressions:
            print(f"- {r}")
        sys.exit(1)
    else:
        print(f"Within regression budget. Runtime: {runtime_minutes}m, Cost: ${cost_usd}")
        sys.exit(0)

if __name__ == "__main__":
    # Mock values for demonstration; in reality, parse from CI reports/billing API
    mock_runtime = 12
    mock_cost = 450
    check_budget(mock_runtime, mock_cost)
