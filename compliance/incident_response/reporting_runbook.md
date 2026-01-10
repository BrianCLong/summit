# Incident Reporting Runbook

## Trigger Conditions

- Policy-defined cyber incident triggers in the detection pipeline.
- Scope token must authorize incident reporting context.

## Runbook Steps

1. Generate incident packet (timeline, impacted assets, scope).
2. Execute preservation actions and hash artifacts.
3. Validate reporting window compliance (policy gate).
4. Export incident binder with reporting checklist.
5. Store digest in transparency log.

## Required Outputs

- Incident packet JSON + replay token
- Preservation chain manifest + hashes
- Reporting checklist aligned to DFARS 7012
- Transparency log digest
