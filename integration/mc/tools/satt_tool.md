# MC Tool: SATT

## Purpose

Execute attested transform templates with license metering and disclosure enforcement.

## Inputs

- `template_id`: transform template reference.
- `input_entity`: entity or dataset reference.
- `tenant_id`: license scope.

## Outputs

- Transform outputs with disclosure constraints applied.
- License receipt and witness references.

## Guardrails

- Require attestation and available license budget.
