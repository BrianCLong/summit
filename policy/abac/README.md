# ABAC Policy Bundle

This directory contains the Rego sources and static data for the identity & policy ABAC decision service.

## Contents

- `abac.rego` – policy definitions for tenant isolation, residency controls, least privilege, and WebAuthn obligations.
- `data.json` – classification weights, residency matrices, and action metadata.
- `manifest.yaml` – bundle manifest used when packaging for OPA distribution.

## Usage

```bash
# format, lint, and test
opa fmt abac.rego
opa test .. -v -r junit > ../../test-results/opa-abac-junit.xml

# build bundle
tar -czf abac-bundle.tar.gz manifest.yaml abac.rego data.json
openssl dgst -sha256 -sign ../../keys/policy-signing.pem -out abac-bundle.tar.gz.sig abac-bundle.tar.gz
```

The signed bundle is uploaded to artifact storage and distributed to gateways via the policy sync job.
