# Attestation Service

Handles trusted execution attestations for computations and publishes quotes.

- Generates quotes for enclave-backed runs across TRACER, SASA, PGTT, RIT, and MEP.
- Binds measurement hashes to replay tokens and output digests.
- Integrates with Transparency Log Service to publish attestations for later verification.
