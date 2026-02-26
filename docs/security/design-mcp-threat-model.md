# Design MCP Threat Model (STRIDE)

## System Boundary

- Ingress: Design MCP API response payloads (JSON + HTML/CSS)
- Processing: Adapter, importer, and implementation planner
- Egress: `artifacts/ui-design/<design-id>/` and CI evidence verdicts

## STRIDE Matrix

| Category | Threat | Control | Gate/Test |
| --- | --- | --- | --- |
| Spoofing | Unauthorized design provider endpoint | API key required; explicit base URL config | Adapter unit test for missing key |
| Tampering | Artifact mutation via nondeterministic fields | Stable JSON serialization and timestamp-key denial | `verify_design_artifact.mjs` |
| Repudiation | No audit linkage between triad files | Shared `evidence_id` across report/metrics/stamp | CI evidence ID consistency check |
| Information Disclosure | Prompt/API key leakage in logs | No prompt logging; key from env only | Secret scan + code review |
| Denial of Service | Oversized artifact payload causing slow import | Bounded import path and deterministic write count | Importer metrics + lane test runtime |
| Elevation of Privilege | Path traversal writes outside artifact root | Filename validation and resolved-path enforcement | Traversal unit test + CI path constraint gate |

## Abuse Cases

- Malicious HTML with inline scripts attempts to persist executable payloads.
- Crafted filenames (for example `../escape.html`) attempt to escape artifact root.
- Timestamp fields inserted into deterministic JSON attempt to defeat reproducibility checks.

## Required Security Invariants

- Imported HTML must be sanitized before write.
- All writes must remain under `artifacts/ui-design/<design-id>/`.
- `report.json`, `metrics.json`, and `stamp.json` must be deterministic and evidence-linked.
- Feature flag remains default OFF (`design-mcp-enabled=false`).

## MAESTRO Mapping

- MAESTRO Layers: Data, Agents, Tools, Observability, Security
- Threats Considered: tool abuse, prompt injection, path abuse, evidence tampering
- Mitigations: sanitization, path guards, deterministic verifier, explicit approval gate for stack migration
