# Deterministic Replay Demo Runbook

## Scenario
Demonstrate deterministic replay of a GitHub Issues MCP session captured on 2025-09-28.

## Prerequisites
- Replay engine container image `intelgraph/replay-engine:alpha1` deployed to staging.
- Session recording stored at `s3://intelgraph-replay/demo/github-issues-2025-09-28.rec`.
- Stub catalog generated via `scripts/replay/build_stubs.sh`.

## Steps
1. Launch replay CLI:
   ```bash
   npm run replay -- \
     --session-id GH-SESSION-2025-09-28-01 \
     --recording s3://intelgraph-replay/demo/github-issues-2025-09-28.rec \
     --output ./artifacts/replay/github-issues/demo
   ```
2. CLI verifies ledger signature (`docs/evidence/provenance-ledger.md` schema) and seeds deterministic RNG.
3. Replay UI (launch via `npm run replay:ui`) loads timeline view with:
   - MCP messages (prompt, tool call, tool result).
   - Policy decision overlays (OPA trace, purpose tags).
   - External stub inspector (HTTP, gRPC).
4. Validate diff mode by running same recording with updated tool version tag `v2025.10.01`.
5. Export replay report (`.json` + `.html`) and attach to evidence bundle.

## Expected Outcomes
- Replay success status = `PASS`.
- Divergence detector shows zero mismatched payload hashes.
- UI surfaces capability token scopes and ledger entry link.

## Supporting Assets
- `tests/replay/replay-fidelity.spec.ts` (automated fidelity suite).
- Grafana dashboard `Replay Overview` for aggregate metrics.
