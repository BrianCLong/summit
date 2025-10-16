# Supply-Chain Provenance Enforcer (SCPE)

SCPE is a CI/CD gate that combines SBOM verification with SLSA-style provenance
to protect machine learning and data pipelines. It validates signatures for
code, data, containers, and training manifests before allowing a build to
progress. When validations pass, SCPE emits a deterministic attested build
receipt that can be verified offline to prove integrity.

## Features

- Deterministic verification of datasets, Python wheels, container images, and
  training manifests.
- Signature verification with Ed25519 (via `cryptography`) or HMAC SHA-256.
- SBOM validation against CycloneDX JSON documents.
- SLSA-style provenance policy enforcement, including builder identity,
  materials, and reproducible build metadata.
- Receipt generation with integrity digests for offline validation.

## Installation

```bash
pip install ./tools/scpe
```

## Usage

### 1. Run verification inside CI

```bash
scpe verify --config tools/scpe/examples/scpe-config.yml --receipt receipt.json
```

- `--config` accepts JSON or YAML configuration files describing the required
  attestations.
- `--receipt` is optional; when provided, SCPE writes a deterministic receipt.

### 2. Verify receipts offline

```bash
scpe receipt-verify --receipt receipt.json
```

The command replays the deterministic digesting process to ensure the receipt
has not been altered and that all attestations were valid at creation time.

## Configuration Schema Overview

```yaml
version: 1
build:
  builder_id: gh://summit/ml-platform
  build_type: train-model
  run_id: ci-12345
  timestamp: 2025-02-16T12:30:00Z
sbom:
  path: tools/scpe/examples/sbom.json
  format: cyclonedx-json
  digest:
    algorithm: sha256
    value: <sha256>
artifacts:
  - name: base-dataset
    type: dataset
    path: tools/scpe/examples/dataset.csv
    digest:
      algorithm: sha256
      value: <sha256>
    signature:
      type: ed25519
      encoding: base64
      value: <signature>
      public_key:
        format: pem
        path: tools/scpe/examples/keys/scpe-signing.pub
    provenance:
      slsa_level: 3
      builder_id: gs://datasets/builder
      source_uri: https://git.example.com/datasets.git@main
      materials:
        - uri: https://git.example.com/datasets.git
          digest: <sha256>
  - name: trainer-wheel
    type: python-wheel
    path: tools/scpe/examples/trainer.whl
    digest: { algorithm: sha256, value: <sha256> }
    signature:
      type: ed25519
      encoding: base64
      value: <signature>
      public_key:
        format: pem
        path: tools/scpe/examples/keys/scpe-signing.pub
    provenance:
      slsa_level: 3
      builder_id: gh://summit/build-bot
      source_uri: https://git.example.com/pipelines.git@v2.1.0
      materials:
        - uri: https://git.example.com/pipelines.git
          digest: <sha256>
  - name: trainer-manifest
    type: training-manifest
    path: tools/scpe/examples/training-manifest.json
    digest: { algorithm: sha256, value: <sha256> }
    signature:
      type: ed25519
      encoding: base64
      value: <signature>
      public_key:
        format: pem
        path: tools/scpe/examples/keys/scpe-signing.pub
    provenance:
      slsa_level: 3
      builder_id: gh://summit/build-bot
      source_uri: https://git.example.com/pipelines.git@v2.1.0
      materials:
        - uri: https://git.example.com/pipelines.git
          digest: <sha256>
```

### Signature Formats

SCPE supports two signature mechanisms:

- `ed25519` (default): Requires a public key in PEM or raw base64 format.
- `hmac-sha256`: Requires a base64-encoded shared secret. Intended for
  constrained environments where asymmetric signing is not available. Secrets
  should be injected securely via environment variables rather than committed to
  the repository.

### Deterministic Receipts

Receipts are serialized with sorted keys and no whitespace, ensuring byte-level
stability across identical inputs. They embed an `integrity` SHA-256 digest of
all verification inputs so that the `receipt-verify` command can validate the
record offline.

## GitHub Action

See [`.github/workflows/scpe.yml`](../../.github/workflows/scpe.yml) for the
reference CI integration.

## Development

Run the example verification from the repository root:

```bash
pip install ./tools/scpe
scpe verify --config tools/scpe/examples/scpe-config.yml --receipt tools/scpe/examples/receipt.json
scpe receipt-verify --receipt tools/scpe/examples/receipt.json
```

Tests are executed with `pytest`:

```bash
pytest tools/scpe/tests
```
