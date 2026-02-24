# Control Replacement Matrix

| Original Control | Replacement / Modification | Justification |
| :--- | :--- | :--- |
| `scripts/verify_evidence.py` timestamp check | Updated regex to `202\d-\d\d-\d\dT\d\d:\d\d:\d\d` | Previous heuristic `202` + `:` flagged valid JSON with year 2026. |
| `evidence/index.json` schema validation | Updated `verify_evidence.py` to support list format | `evidence/index.json` uses list format, validator expected dict. |
| `pnpm-lock.yaml` frozen lockfile check | Updated `pnpm-lock.yaml` via `pnpm install` | Dependencies for `agents/governance` were missing in lockfile. |
| `docker-compose.dev.yaml` validation | Removed merge conflict markers | File contained invalid YAML due to bad merge. |
| `pr-quality-gate.yml` LongRunJob check | Added `pnpm/action-setup` | `setup-node` with pnpm cache requires pnpm to be installed. |
| `ci-security.yml` artifact upload | Renamed artifacts to be unique | GitHub Actions v4 forbids overwriting artifacts with same name. |
