# Graphika RMEP: Releasability & Markings Evidence Pack

Implements tiered releasability packs with NATO/DoD markings, provenance, and replayable manifests.

## Capabilities

- Multi-scope generation: US-only, coalition, partner with jurisdiction-aware redactions.
- Redaction deltas enabling authorized reconstruction from more-restricted packs.
- Manifest with Merkle-root commitment, replay token, and optional TEE attestation quote.
- Transparency log entry per release; supports counterfactual pack generation for information-loss metrics.

## Inputs

- Narrative analysis output
- Sharing policy with scopes, byte/entity budgets, jurisdiction attributes
- Provenance references and schema versions

## Outputs

- Evidence packs (one per scope)
- Pack manifest + redaction delta
- Replay token binding to snapshot/seed/schema
- Transparency log digest
