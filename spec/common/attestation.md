# Attestation

Trusted execution evidence supporting generation of regulated artifacts.

- **Quote contents:** measurement hash, code identity, policy version, timestamp, signer, nonce.
- **Use cases:** releasability pack generation, evidence compilation, incident packet assembly, connector execution.
- **Validation:** verify signer chain, nonce freshness, measurement hash alignment; record result in manifest/assurance report.
- **Storage:** attestation digests logged to transparency log; failures block export and raise governance alert.
