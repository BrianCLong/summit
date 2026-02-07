# Local LM Studio Provider (OpenAI-Compatible)

## Purpose

This provider connects Summit agents to an LM Studio server that exposes an OpenAI-compatible
Chat Completions API. It is opt-in behind `FEATURE_LOCAL_LMSTUDIO` and keeps default provider
behavior unchanged.

## Configuration

- **Base URL:** `FEATURE_LOCAL_LMSTUDIO=1` with `LMSTUDIO_BASE_URL` set to
  `http://127.0.0.1:1234/v1` (LM Studio default).
- **API Key:** Optional; pass through if the server requires it.

## MAESTRO Threat Modeling Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered:** prompt flooding, tool transcript bloat, provider spoofing,
  template portability failures.
- **Mitigations:** token-budget deny-by-default guard, prompt template lint gate, base URL
  allowlisting policy, evidence schema validation and redaction.

## Operational Notes

- The LM Studio server must be running locally with the OpenAI-compatible API enabled.
- The provider uses `fetch` and expects `choices[0].message.content` in responses.
- Rollback: set `FEATURE_LOCAL_LMSTUDIO=0`.

## Governance

Reference the Summit Readiness Assertion and evidence IDs in `docs/ga/evidence.md` before
promoting this provider beyond local development.
