# SERA CLI Proxy Integration Prompt (v1)

## Intent

Implement a Summit-native SERA CLI-style proxy and launcher integration that:

- Proxies OpenAI-compatible `/v1/chat/completions` requests to a configured endpoint.
- Injects `Authorization: Bearer <api_key>` headers when provided.
- Supports model overrides via CLI or environment variables.
- Emits deterministic evidence artifacts (`report.json`, `metrics.json`, `stamp.json`).
- Enforces deny-by-default host allowlists.

## Constraints

- Feature remains opt-in (no default background execution).
- No secrets are logged or persisted; only hashes are stored.
- Artifacts write only to an explicit artifact directory.
- CLI overrides environment defaults.

## Output Expectations

- CLI command: `summit sera-proxy start` with documented flags.
- Evidence artifacts are deterministic and timestamp-free.
- Documentation updates under `docs/`.
- Tests cover proxy forwarding and config override behavior.
