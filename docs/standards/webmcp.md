# WebMCP Standard Mapping (Summit)

## Summit Readiness Assertion

This standard defines Summit's governance-first subsumption of browser-native MCP sessions by converting WebMCP transcript input into deterministic evidence with enforceable policy gates.

## Import / Export Mapping

| Import | Export |
| --- | --- |
| WebMCP transcript JSON | Summit Evidence JSON (`SUMMIT-WEBMCP-*`) |
| Browser origin metadata | Policy decision log (`origin_not_allowlisted`, `blocked_action`, etc.) |

## Minimal Winning Slice

1. Transcript ingestion via `adapters/webmcp/ingest.py`.
2. Schema validation contract in `evidence/browser_session.schema.json`.
3. Deny-by-default browser tool gate in `policy/browser_tool_gate.py`.
4. Deterministic replay artifacts (`report.json`, `metrics.json`, `stamp.json`) via `scripts/replay/webmcp_replay.py`.

## Non-goals

- Browser automation runtime.
- Planner replacement.
