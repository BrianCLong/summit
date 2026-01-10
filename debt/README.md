# Technical Debt Registry

This directory contains the authoritative registry of technical debt for the Summit repository.
It is governed by the Debt Retirement Engine to ensure monotonic improvement.

## Files

- `registry.yaml`: The machine-readable source of truth for all acknowledged debt.
- `budgets.yaml`: Defines debt budgets per sprint and agent.
- `playbooks/`: Approved patterns for retiring debt safely.

## Principles

1. **No Hidden Debt**: All debt must be enumerated here.
2. **No Regression**: CI fails if total debt increases or if new debt is added without a registry entry.
3. **Monotonic Improvement**: Every PR should ideally reduce debt or at least not increase it.
