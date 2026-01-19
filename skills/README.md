# Skills

This repo uses “agent skills” as composable, governed instruction packs.

## Governance Layer

- `skills/registry.yaml` is the allowlisted source-of-truth for skill ingestion.
- `skills/packs/` defines pack-level installations (pinned, auditable).
- Vendored skills live under `skills/vendored/` with provenance constraints.

## Installed packs

- `context-engineering-pack/` – Summit wrapper pack that routes to vendored upstream context-engineering skills.
- `packs/summit-baseline.yaml` – Summit baseline pack covering governance and UI/React skills.

## Governed Exceptions

External skill imports are intentionally constrained until the governed import
pipeline validates provenance and allowlist requirements.
