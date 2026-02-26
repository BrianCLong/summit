# Modulith Interoperability Standards

## Configuration
Modulith configuration is defined in `config/modules.yaml` using a standard YAML schema.

## Artifacts
The verifier produces three JSON artifacts following the Summit evidence standards:

| Artifact | Purpose | Schema |
| --- | --- | --- |
| `report.json` | Detailed list of violations | `evidence.report.schema.json` |
| `metrics.json` | Scan performance and summary stats | `evidence.metrics.schema.json` |
| `stamp.json` | Verification metadata | `evidence.stamp.schema.json` |

## Language Support
- **MWS (Minimal Winning Slice)**: Supports Python AST analysis for files in `summit/`.
- **Future**: Extensions for other languages (e.g., Go, Rust) would follow the same YAML config and JSON report standards.

## Event-Driven Communication
When `cross_module_requires_event` is enabled, inter-module dependencies must be brokered through sub-packages named `events`. This aligns with the "Event-First" architectural North Star of the Summit ecosystem.
