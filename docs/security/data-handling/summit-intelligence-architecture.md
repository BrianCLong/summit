# Summit Intelligence Architecture Data Handling

## Classification

- **Public marketplace metadata**: allowed
- **Public product docs**: allowed
- **Public company metadata**: allowed
- **Customer usage telemetry**: out of scope
- **Billing data**: forbidden
- **Private partner APIs**: forbidden unless separately approved

## Retention

Retain only normalized public metadata and evidence references needed for reproducibility.
Do not retain raw sensitive payloads.

## Never log

- API tokens
- customer IDs
- private connector endpoints
- auth headers
- proprietary prompt contents
- enterprise telemetry blobs
