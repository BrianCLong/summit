# Threat Model Index (Phase 1)

| Feature | Threat Model | Last Updated | Owner |
| --- | --- | --- | --- |
| Authentication & Session Management | [auth.md](./threat-models/auth.md) | 2026-05-08 | Identity & Access (iam-security@summit) |
| IntelGraph Multi-Tenant Queries | [intelgraph-queries.md](./threat-models/intelgraph-queries.md) | 2026-05-08 | Graph Platform (graph-security@summit) |
| Maestro Automation Runs | [maestro-runs.md](./threat-models/maestro-runs.md) | 2026-05-08 | Automation & Orchestration (maestro@summit) |
| Template | [template.md](./threat-models/template.md) | n/a | Use for new features |

## Maintenance Notes
- Update the relevant row whenever a threat model changes (owner or `last-updated`).
- Keep owners actionable (team inbox or DRI) and align with on-call rotations.
- Add new features as they become high-risk or reach GA; ensure the coverage checker maps directories to the new model.
