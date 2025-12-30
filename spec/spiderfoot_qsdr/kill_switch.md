# Kill Switch and Audit

## Detection Inputs

- Canary trigger events with evidence payloads.
- Query-shape violations (active probes, rate-limit breaches, disallowed endpoints).
- Privacy budget exhaustion for a target.

## Actions

1. Halt module execution and revoke module execution token.
2. Quarantine module pending human review; block further requests.
3. Generate kill audit record with evidence support set, policy decision ID, and replay token.
4. Store kill audit record in witness ledger and transparency log; emit alert.

## Output Handling

- Recon results prior to halt are transformed for selective disclosure (aggregation/redaction) before return.
- Export requires policy approval and adherence to disclosure constraints.
