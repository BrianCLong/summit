# MC Tool: QSDR

## Purpose

Run distributed recon with canary targets and query-shape enforcement.

## Inputs

- `targets`: recon targets.
- `modules`: requested modules.
- `policy_scope`: policy token for allowed behaviors.

## Outputs

- Recon results (selective disclosure).
- Kill audit record if execution halted.

## Guardrails

- Enforce canary and query-shape policies, log compliance decisions.
