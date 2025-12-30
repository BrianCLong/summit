# Replay Service

Executes deterministic replays for receipts using replay tokens.

## Workflow
- Resolve provenance snapshot via provenance service.
- Re-run wedge computation (inverse diffusion, deconfliction, migration compile, macro synthesis, token enforcement) under recorded budgets.
- Validate Merkle roots, witness chains, and attestation quotes.
- Emit verification results to transparency log.
