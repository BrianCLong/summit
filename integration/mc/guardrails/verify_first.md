# Guardrail: Verify-First

All MC tools must validate upstream attestations, manifests, and replay tokens before exposing artifacts to users or downstream systems.

- Checks transparency log inclusion proofs.
- Verifies manifest signatures and attestation validation tokens.
- Blocks export when verification fails; emits governance alerts.
