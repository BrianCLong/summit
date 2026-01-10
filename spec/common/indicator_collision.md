# Indicator Collision & Alias Resolution

## Purpose

Canonicalize indicators by detecting collisions (same value, different meaning)
and aliases (different values, same object).

## Inputs

- `indicator_value`
- context attributes (timestamp, location, malware family, actor)
- provenance and feed metadata

## Outputs

- canonical indicator object
- collision annotations
- collision proof (support set + commitments)

## Constraints

- Proof budget (evidence count or verification time)
- Policy guardrails on automated actions
