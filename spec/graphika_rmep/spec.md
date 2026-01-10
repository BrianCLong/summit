# Graphika RMEP - Releasability-Markings Evidence Pack

## Overview

RMEP generates tiered releasability packs (US-only, coalition, partner) with manifest commitments, redaction deltas, and replay tokens.

## Inputs

- Narrative analysis output
- Scope token and sharing policy
- Provenance references

## Outputs

- Releasability packs per scope
- Pack manifest (Merkle root + policy version)
- Redaction delta
- Transparency log digest

## Data Model (Core)

- `pack_id`, `scope`, `markings`
- `manifest_hash`, `replay_token`
- `redaction_delta_ref`
- `provenance_refs`

## Policy Gate

- Scope token validation
- Egress budgets
- Attestation requirement
- Enforced via `intelgraph.policy.contracting`
