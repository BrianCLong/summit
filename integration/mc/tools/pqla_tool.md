# MC Tool: PQLA

## Purpose

Run policy-qualified analytics and return proof-carrying aggregates.

## Inputs

- `request`: analytics operation and parameters.
- `subject_context`: subject and purpose metadata.
- `disclosure_constraints`: optional overrides within policy bounds.

## Outputs

- Transformed analytic output.
- Compliance artifact and witness references.

## Guardrails

- Require policy authorization and disclosure verification before output.
