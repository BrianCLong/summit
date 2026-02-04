# Prompt: Shai-Hulud Supply-Chain Subsumption Bundle (v1)

## Objective

Add the initial subsumption bundle scaffold for supply-chain incident controls, including manifest,
standards/runbook/decision docs, evidence artifacts, and registry updates.

## Scope

- subsumption/shai-hulud-supply-chain/\*\*
- evidence/subsumption/shai-hulud-supply-chain/\*\*
- evidence/schemas/subsumption\_\*.schema.json
- docs/standards/shai-hulud-supply-chain.md
- docs/security/data-handling/shai-hulud-supply-chain.md
- docs/ops/runbooks/shai-hulud-supply-chain.md
- docs/decisions/shai-hulud-supply-chain.md
- evidence/index.json
- docs/roadmap/STATUS.json
- agents/examples/\*\*
- prompts/registry.yaml

## Constraints

- Deterministic evidence artifacts; timestamps only in stamp.json.
- No public API changes.
- Additive-only changes.

## Output

- Subsumption manifest + docs + evidence artifacts.
- Evidence index entry with concrete file paths.
