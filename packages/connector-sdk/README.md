# @summit/connector-sdk

Governed OSINT connector SDK for Summit.

## Responsibilities

- validate connector manifests
- enforce policy references
- provide deterministic run ids
- normalize connector outputs
- emit replay-safe evidence metadata

## Invariants

- identical input + raw fixture + transform must produce identical output
- output ordering must be stable
- policy denial prevents execution
- manifests are schema-validated before execution
