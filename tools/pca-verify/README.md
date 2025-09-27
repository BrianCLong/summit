# pca-verify

`pca-verify` is an offline Proof-Carrying Analytics (PCA) verifier that validates analytic result bundles against their signed manifests.

## Features

- Signature validation for lineage DAG envelopes (Ed25519 or RSA-SHA256).
- Deterministic replay of stubbed analytics DAGs using local fixtures only.
- Checksum attestation for each intermediate artifact in the bundle.
- Verdict reports (`match`, `variance`, `error`) with tolerance-aware variance analysis.
- Structured failure logs for audit trails when tampering is detected.

## Usage

```bash
pca-verify --manifest ./bundle/manifest.json --fixtures ./bundle/fixtures.json \
  --report ./verifier-report.json --failure-log ./verifier-failures.log
```

Options:

- `--manifest` Path to the analytics bundle manifest (required).
- `--fixtures` Path to the local fixture payloads used during replay (required).
- `--report` Optional path to write the verifier result JSON.
- `--failure-log` Optional path for audit logs when the verdict is not `match` (defaults to `pca-verify.failures.log`).
- `--tolerance-multiplier` Scales manifest tolerances (must be a positive number).

## SDK

Import the lightweight verifier to embed PCA checks into other tooling:

```ts
import { verifyDAG, type Manifest, type Fixtures } from '@summit/pca-verify';

const manifest: Manifest = /* load manifest */;
const fixtures: Fixtures = /* load fixtures */;
const result = verifyDAG(manifest, fixtures);
```

## Development

```bash
npm install
npm run test
```

Tests use Node's built-in `node:test` runner with golden fixtures to ensure tampering triggers non-zero exit codes and detailed diff reports.
