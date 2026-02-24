# GCP Managed MCP Standard

## Scope

Summit supports a policy-gated integration surface for Google Cloud managed MCP database tools.

## Contract

- Feature flag is deny-by-default (`SUMMIT_GCP_MANAGED_MCP_ENABLED=0` unless explicitly enabled).
- Query input must be structured (`query.table`, `query.columns`, `query.filters`, `row_limit`).
- Raw SQL text payloads are forbidden.
- Tool and project allowlists are mandatory.
- Row limits must remain at or below policy cap.

## Managed vs Self-Hosted

- `mode=managed`: use managed MCP endpoint contract.
- `mode=self-hosted`: allowed for compatibility testing only, same policy gates apply.

## Evidence Output

Every probe/run must emit deterministic artifacts:

- `report.json`
- `metrics.json`
- `stamp.json`

`report.json` and `metrics.json` are deterministic and timestamp-free. Runtime timing metadata is restricted to `stamp.json`.

## MAESTRO Alignment

- MAESTRO Layers: Data, Agents, Tools, Observability, Security.
- Threats Considered: prompt injection via query payloads, exfiltration via uncapped rows, privilege escalation via scope abuse.
- Mitigations: structured payload validation, row caps, IAM scope checks, deny-by-default allowlisting, drift checks.
