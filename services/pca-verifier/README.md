# Proof-Carrying Analytics (PCA) Verifier

A minimal implementation of Proof-Carrying Analytics that creates signed provenance manifests for data transformation pipelines and enables deterministic verification by external parties.

## Overview

The PCA Verifier implements a cryptographic chain-of-custody system for analytics workflows. It:

1. **Records** every transformation step with input/output hashes
2. **Builds** a Merkle tree of all operations
3. **Signs** the manifest for authenticity
4. **Verifies** results by deterministically replaying the pipeline

This enables **offline verification** where any party can independently confirm that reported results actually came from declared inputs and transforms—without trusting the executor.

## Features

- ✅ **Hash Tree Manifests**: Merkle tree of inputs, transforms, params, versions
- ✅ **Deterministic Replay**: Bit-for-bit reproducible verification
- ✅ **CLI Tools**: `pca build`, `pca verify`, `pca inspect`
- ✅ **Sample Transforms**: Parse, dedupe, aggregate, filter
- ✅ **Tolerance Support**: Numeric equality within epsilon for floating-point ops
- ✅ **Pluggable Security**: Ready for production key management (dev keys included)
- ✅ **Unit Tests**: Full test coverage
- ✅ **Dockerized**: Self-contained verification environment

## Quick Start

### Installation

```bash
cd services/pca-verifier
pnpm install
pnpm build
```

### Build a Manifest

```bash
pnpm pca build \
  --input fixtures/sample.csv \
  --dag fixtures/sample-dag.json \
  --output manifest.json \
  --tolerance 0.001
```

This creates a signed manifest from:
- **Input**: `fixtures/sample.csv` (sample CSV data)
- **DAG**: `fixtures/sample-dag.json` (parse → dedupe → aggregate)
- **Output**: `manifest.json` (provenance manifest with signature)

### Verify a Manifest

```bash
pnpm pca verify \
  --manifest manifest.json \
  --input fixtures/sample.csv
```

The verifier:
1. Replays all transforms deterministically
2. Compares hashes at each step
3. Validates Merkle root
4. Reports **VALID** or **INVALID**

### Inspect a Manifest

```bash
pnpm pca inspect --manifest manifest.json
```

Shows:
- Root hash
- All transform steps
- Input/output hashes per step
- Signature status

## Usage

### Programmatic API

```typescript
import {
  ManifestBuilder,
  ProvenanceVerifier,
  defaultExecutor,
  type TransformDAG,
} from '@intelgraph/pca-verifier';

// Define transform pipeline
const dag: TransformDAG = {
  transforms: [
    {
      id: 'parse-1',
      type: 'parse',
      version: '1.0.0',
      params: { delimiter: ',', hasHeader: true },
    },
    {
      id: 'dedupe-1',
      type: 'dedupe',
      version: '1.0.0',
      params: { key: 'id' },
    },
  ],
  dependencies: new Map([
    ['parse-1', []],
    ['dedupe-1', ['parse-1']],
  ]),
};

// Build manifest
const inputData = await fs.readFile('data.csv', 'utf-8');
const manifest = await ManifestBuilder.buildFromDAG(
  dag,
  inputData,
  defaultExecutor,
  0.001, // tolerance
);

console.log('Root Hash:', manifest.rootHash);
console.log('Signature:', manifest.signature);

// Verify manifest (e.g., by external party)
const verifier = new ProvenanceVerifier();
const result = await verifier.verify(manifest, inputData, defaultExecutor);

if (result.valid) {
  console.log('✓ Provenance verified!');
} else {
  console.error('✗ Verification failed:', result.errors);
}
```

### Custom Transforms

```typescript
import type { Transform } from '@intelgraph/pca-verifier';

// Implement custom transform
async function myCustomTransform(data: any[], params: Record<string, any>) {
  // Your logic here
  return data.map((row) => ({
    ...row,
    custom: params.customValue,
  }));
}

// Register executor
const customExecutor = async (transform: Transform, input: any) => {
  if (transform.type === 'custom') {
    return myCustomTransform(input, transform.params);
  }
  return defaultExecutor(transform, input); // fallback
};

// Use in manifest build
const manifest = await ManifestBuilder.buildFromDAG(
  dag,
  inputData,
  customExecutor,
);
```

## Transform Types

### Built-in Transforms

| Type       | Description                     | Params                                           |
| ---------- | ------------------------------- | ------------------------------------------------ |
| `parse`    | Parse CSV/delimited text        | `delimiter`, `hasHeader`                         |
| `dedupe`   | Remove duplicates by key        | `key`                                            |
| `aggregate`| Group and aggregate values      | `groupBy`, `aggregateField`, `operation`         |
| `filter`   | Filter rows by predicate        | `field`, `operator`, `value`                     |

### Aggregate Operations

- `sum`, `count`, `avg`, `min`, `max`

### Filter Operators

- `eq`, `ne`, `gt`, `lt`, `gte`, `lte`, `contains`

## Manifest Format

```json
{
  "version": "1.0",
  "created": "2025-01-15T10:30:00.000Z",
  "rootHash": "abc123...",
  "signature": "def456...",
  "verifier": {
    "algorithm": "sha256",
    "tolerance": 0.001
  },
  "nodes": [
    {
      "hash": "input-hash",
      "type": "input",
      "timestamp": "2025-01-15T10:30:00.000Z",
      "metadata": { "source": "csv" }
    },
    {
      "hash": "transform-hash",
      "type": "transform",
      "timestamp": "2025-01-15T10:30:01.000Z",
      "transform": {
        "id": "parse-1",
        "type": "parse",
        "version": "1.0.0",
        "params": { "delimiter": "," },
        "inputHash": "input-hash",
        "outputHash": "parsed-hash"
      }
    },
    {
      "hash": "output-hash",
      "type": "output",
      "timestamp": "2025-01-15T10:30:02.000Z",
      "metadata": { "finalTransform": "aggregate-1" }
    }
  ]
}
```

## Testing

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test --coverage

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Docker

```bash
# Build image
docker build -t pca-verifier .

# Run verification
docker run -v $(pwd)/fixtures:/data pca-verifier verify \
  --manifest /data/manifest.json \
  --input /data/sample.csv
```

## Security Notes

### Development Mode (Current)

- **HMAC signatures** with hardcoded dev key
- **Pluggable key interface** ready for production

### Production Recommendations

1. **Replace signature mechanism** with RSA/ECDSA
2. **Use HSM or cloud KMS** for private keys
3. **Publish public keys** via JWKS endpoint
4. **Add timestamp authority** for non-repudiation
5. **Store manifests** in immutable ledger (e.g., blockchain, S3 Object Lock)

## Integration with Summit/IntelGraph

This service integrates with:

- **Provenance Ledger** (`prov-ledger`): Store manifests long-term
- **Policy Compiler** (`policy-compiler`): Enforce provenance requirements
- **GraphRAG Copilot**: Verify analytics before answering queries
- **Audit Service**: Log all verification attempts

## Roadmap

- [ ] Multi-party signatures (quorum)
- [ ] Differential privacy proofs in manifest
- [ ] ZK-SNARK integration for private verification
- [ ] Streaming verification (incremental Merkle proofs)
- [ ] Interactive verification UI

## License

Part of Summit/IntelGraph platform. See root LICENSE.

## Support

For issues or questions:
- GitHub Issues: [BrianCLong/summit](https://github.com/BrianCLong/summit)
- Docs: `docs/`
- Runbooks: `RUNBOOKS/pca-verifier.md`
