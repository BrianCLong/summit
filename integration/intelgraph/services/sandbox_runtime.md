# Sandbox Runtime Service

## Role

Provides managed sandbox environments for PQLA analytics and optionally for QSDR monitoring.

## Capabilities

- Enforces resource limits (CPU/memory/time) and network egress policies.
- Supports TEE-backed execution with attestation quotes.
- Streams execution traces under proof budgets for witness ledger anchoring.

## Integration Points

- Invoked by PQLA pipeline post-policy approval.
- Optional monitoring for QSDR inspectors to ensure untampered kill-switch logic.
- Emits determinism tokens and attestation references to downstream compliance artifacts.
