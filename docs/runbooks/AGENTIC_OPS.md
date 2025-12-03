# Agentic Operations Runbook

## Overview
This runbook details the operations for the Agentic Control Plane, managed via `summitctl`.

## Tools
The primary tool is `summitctl` (located in `tools/summitctl`).

### Commands
- **Runbook Management**: `summitctl runbook list`
- **Governance Checks**: `summitctl governance check`
- **Disaster Recovery**: `summitctl dr simulate`
- **Context Search**: `summitctl mcp context "query"`

## Operational Procedures

### 1. Governance Audit
Run `summitctl governance check` before every release to ensure all compliance artifacts are present.
- Expects `docs/GOVERNANCE.md` and `CODEOWNERS` to exist.

### 2. Disaster Recovery (DR) Simulation
Run `summitctl dr simulate` to verify that the system can handle agent failures.
- This script simulates a "brain freeze" scenario where the Agentic Control Plane stops responding.
- Verify that the simulation reports "RECOVERY INITIATED" and passes.

### 3. Feature Tracking
Features are tracked in `.agentic-prompts/feature_list.json` (if exists).

## Troubleshooting
If `summitctl` fails:
1. Check `tools/summitctl/package.json` deps.
2. Ensure `tsx` is available via `npx`.
