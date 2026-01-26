# Intelligence Foundry Operating Model

## Roles

- Foundry Owner: defines domain objectives and approves policies
- Policy Steward: authors, versions, and audits policies
- Model Steward: manages model registry, evaluations, and drift signals
- Agent Engineer: implements agent contracts and tool integrations
- Auditor/Compliance: verifies evidence bundles and controls mapping
- Platform Operator: manages infrastructure, keys, and runtime security

## Workflow (Canonical)

1. Define policy (versioned, hashed, activated)
2. Register assets with rights metadata
3. Register models/agents with digests and contracts
4. Submit work order referencing policy hash
5. Execute under policy gateway and provenance capture
6. Seal evidence bundle and sign attestations
7. Verify evidence offline or in CI
8. Retain or delete per policy retention profile

## Governance Gates

- High-risk tools require approvals
- Model deployment requires policy allow + optional approvals
- Exports require destination allow-list
- Evidence bundles are immutable once sealed
