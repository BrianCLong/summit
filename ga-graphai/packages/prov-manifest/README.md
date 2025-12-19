# @intelgraph/prov-manifest

Provenance Manifest verifier for IntelGraph export bundles. Given a directory containing
`manifest.json` and exported artifacts (PDF/HTML and exhibits), the verifier validates the
manifest schema, file hashes, transform chaining, and evidence references.

## Usage

### Library

```ts
import { verifyManifest } from '@intelgraph/prov-manifest';

const report = await verifyManifest('/path/to/bundle');
if (!report.valid) {
  console.error(report.issues);
}
```

### CLI

```bash
ig-manifest verify ./path/to/bundle
ig-manifest verify ./path/to/bundle --json
```

### CLI Help

```bash
ig-manifest --help
ig-manifest verify --help
```

## Manifest versioning

`manifestVersion` is required. The current schema version is `1.0.0`. Future versions should be
added alongside the schema in `src/schema.ts` and negotiated by `verifyManifest`.

## Development

- Install: `npm install`
- Build: `npm run build`
- Test: `npm test`

