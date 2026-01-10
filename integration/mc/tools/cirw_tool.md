# MC Tool: CIRW

## Purpose

Query identity clusters with uncertainty bounds and witness validation.

## Inputs

- `query`: cluster search criteria.
- `min_confidence`: threshold for candidates.
- `tenant_scope`: tenant or federation token.

## Outputs

- Candidate clusters with confidence intervals.
- Witness references and commitment IDs.

## Guardrails

- Verify policy decision and witness ledger entry before returning results.
