# Attestation Service

The attestation service verifies trusted execution for sensitive modules.

- Issues attestation evidence containing measurements of binaries, containers, and policy configs.
- Binds evidence to replay tokens and records references in the transparency log.
- Provides evaluator scripts for evidence verification prior to executing replay manifests.
