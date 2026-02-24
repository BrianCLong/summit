# Notion Agents Standard

## Scope

This standard defines a Summit-native computer-use simulation lane for Notion-style workflow automation.

## Position

Summit ships governed capability, not generic autonomy:

- Deterministic execution in simulation mode.
- Policy-gated steps with deny-by-default controls.
- Evidence artifacts emitted per run: `report.json`, `metrics.json`, `stamp.json`.

## Contract

1. Input is a YAML/JSON plan (`summit agent run <plan>`).
2. `policy.name` is mandatory.
3. Any network action (`network_call`, `http_request`, `fetch_url`, `open_socket`) is blocked.
4. `report.json` and `metrics.json` are deterministic.
5. `stamp.json` carries canonical `generated_at` (`1970-01-01T00:00:00Z`) and hashes.

## MAESTRO Alignment

- MAESTRO Layers: `Agents`, `Tools`, `Security`, `Observability`
- Threats Considered: network abuse, prompt/plan injection, capability escalation
- Mitigations: deny-by-default allowlist, schema validation, deterministic artifact hashing, CI policy check job `computer_use_policy_check`

## Non-Goals

- Full desktop/RPA automation
- Outbound network-enabled execution
- Unbounded autonomous tool use
