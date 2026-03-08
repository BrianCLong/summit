# Structural Correctness Data Handling

## Never log

- Raw model outputs
- Raw document text or images
- Full LaTeX source bodies

## Allowed

- SHA256 hashes of payloads
- Rule identifiers, severities, and aggregate metrics
- Minimal parse/safety error codes without payload echo

## Security defaults

- Validators run in deny-by-default mode.
- LaTeX validator blocks shell/file primitives.
- Feature flag default is disabled.
