# Summit Deploy Pack Standard (v1.0.0)

This standard defines how Summit packages and validates deployable units ("Packs"), subsuming the multi-source deployment concepts from CreateOS while maintaining Summit's evidence-first governance.

## Spec Model

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Spec version (currently "1.0.0") |
| `name` | string | Human-readable name of the pack |
| `description` | string | Description of purpose |
| `source` | object | Deployment source (github/docker/upload/ai-generated) |
| `policy` | object | Deny-by-default path and tool restrictions |

## Determinism Requirements

- Build IDs must be derived from the content hash (SHA-256) of the manifest.
- Timestamps in evidence must be isolated to `stamp.json` or use the canonical epoch `2026-01-23T00:00:00Z`.
- Field ordering in JSON artifacts must be stable (alphabetical).

## Deployment Flow

1. **Package**: Define `summit.deploy.json`.
2. **Validate**: Run `summit.run_validation` via MCP or CI.
3. **Attest**: Produce `EVID-CREATEOS-MCP-####` evidence.
4. **Deploy**: CI-gated promotion based on evidence.
