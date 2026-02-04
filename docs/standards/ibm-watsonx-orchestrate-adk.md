# IBM watsonx Orchestrate ADK — Summit S-ADK Interop Standard

## Purpose
Define the Summit-native Agent Development Kit (S-ADK) workflow that mirrors the
ADK lifecycle shape (manifest → validate → run → package) while maintaining
deterministic artifacts and policy-first defaults.

## Scope
- **In scope**: Manifest schema, tool/connection descriptors, knowledge-base
  references, local runner, evidence artifacts, deterministic packaging.
- **Out of scope**: Deployment to IBM platforms, IBM-specific APIs, or parity
  claims beyond workflow shape.

## Summit S-ADK Manifest v1 Mapping
| ADK Concept | Summit S-ADK Field | Notes |
| --- | --- | --- |
| Agent metadata | `schema_version`, `name`, `description` | Versioned manifest. |
| Tools | `tools[]` | Declarative tool descriptors. |
| Connections | `connections[]` | Named connection descriptors. |
| Knowledge base | `knowledge_base.sources[]` | URI-only references; no raw content. |
| Policy | `policy.allow_tools`, `policy.allow_network` | Deny-by-default controls. |

## Import/Export Matrix
- **Import**: YAML/JSON agent definitions → `s-adk/v1` manifest.
- **Export**: `.sadk.tgz` package (manifest + assets) with manifest digest.
- **Non-goals**: IBM runtime deployment, IBM tool SDK parity.

## Deterministic Evidence Artifacts
S-ADK runs must emit:
- `trace.jsonl`
- `result.json`
- `metrics.json`
- `stamp.json` (hashes + git sha only; no timestamps)

## Governance Alignment
S-ADK aligns with Summit’s evidence-first governance by producing deterministic
artifacts suitable for policy gates and audit trails.
