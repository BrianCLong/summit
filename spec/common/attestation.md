# Attestation Primitive

Defines use of trusted execution environments (TEEs) for critical computations.

## Scope
- Inverse diffusion (IPIO), indicator deconfliction (IDCP), schema compilation (OMCP), macro generation (TCGI), and token enforcement (LLCT).

## Requirements
- Workloads can run inside a TEE with measurements recorded.
- Receipts include attestation quotes and measurement hashes.
- Policy gateway must validate attestation status before accepting receipts into the transparency log.
- Replay must indicate whether TEE execution was required or optional.
