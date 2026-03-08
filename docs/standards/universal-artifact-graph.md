# Universal Assurance Graph (UAG)

The Universal Assurance Graph (UAG) represents the core reasoning layer of Summit across all software supply-chain artifact types.

## Node Kinds
- `Artifact`
- `Component`
- `Dependency`
- `Build`
- `Attestation`
- `SBOM`
- `Policy`
- `Finding`
- `RuntimeTarget`
- `RemediationAction`

## Edge Kinds
- `DEPENDS_ON`
- `BUILT_BY`
- `DESCRIBED_BY`
- `ATTESTED_BY`
- `VIOLATES`
- `AFFECTS`
- `DEPLOYED_TO`
- `REMEDIATED_BY`
- `DERIVES_FROM`

## Canonical Evidence ID Pattern
`EVID::<artifact_family>::<source>::<stable_subject>::<seq>`

### Deterministic Artifacts
Outputs generated from the UAG (e.g., `report.json`, `metrics.json`, `stamp.json`) strictly exclude wall-clock timestamps in favor of schema versions and content digests to guarantee reproducibility and test determinism.
