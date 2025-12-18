# Interop Exporters & Round-Trip Validator (Prompt #71)

- **Feature flag:** `IOX_ENABLED` (default: false)
- **Formats:** STIX 2.1 + JSON-LD first; GraphML/CSV next
- **CLI/UI:** `iox export|import` (batch/stream) with policy filters; UI wizard for field maps, license tags, preview deltas
- **Guarantees:** signed manifests; round-trip drift ≤2% optional props; required props must round-trip intact
- **Tests:** golden corpora; Playwright map→export→import→compare; residency/LAC checks
