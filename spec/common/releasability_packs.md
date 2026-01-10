# Releasability Packs

Tiered export artifacts that encapsulate releasability policies, redaction rules, and audit evidence for coalition sharing.

## Required Contents

- Pack payload artifacts (narratives, entity lists, references)
- Marking metadata (classification + handling guidance)
- Redaction delta pointer
- Replay token binding to pack manifest
- Provenance references

## Pack Manifest

- Merkle-root commitment to included artifacts
- Hash of redaction delta
- Policy bundle version
- Optional TEE attestation quote

## Redaction Delta

- Describes differences between scopes
- Permits reconstruction of less-restricted outputs only when authorized
- Stored alongside manifest hash

## Egress Control

- Byte budget and entity count limit per pack
- Enforcement via `intelgraph.policy.contracting`

## Audit Evidence

- Transparency log digest of the manifest
- Release event entry with scope token ID
