# TTT-Discover Data Handling

## Classification

- **Prompts**: sensitive (do not log raw prompts)
- **Evaluator inputs**: sensitive (may include proprietary data)
- **Artifacts**: controlled output; treated as data only
- **Model deltas**: restricted (per-problem adapters)

## Retention Policy

- Default: keep `report.json`, `metrics.json`, `stamp.json`, and `artifact/` outputs only.
- Optional: keep attempt traces when explicitly enabled.

## Never-Log List

- API keys or tokens
- Raw dataset rows
- System prompts
- File contents outside the workspace

## Threat → Mitigation → Gate → Test

1. **Prompt/data exfiltration via logs** → structured logging + never-log list → redaction gate → fixture must not appear in logs.
2. **Arbitrary code execution from generated artifacts** → treat artifacts as data, no auto-exec, allowlist paths → traversal gate → unit test rejects `../`.
3. **Network abuse / unintended calls** → network disabled by default; allow flag required → integration gate → default run opens no sockets.
4. **Cost runaway** → enforce step/token budgets → budget gate → abort writes complete report.
5. **Non-determinism** → seeded RNG + stable sorting + pinned deps → determinism gate → byte-for-byte report test.

## MAESTRO Security Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security
- **Threats Considered**: data exfiltration, tool abuse, non-deterministic output
- **Mitigations**: logging redaction, allowlist IO, deterministic serializers, budget enforcement
