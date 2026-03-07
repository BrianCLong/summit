# @intelgraph/prov-manifest

Provenance manifest verifier for IntelGraph export bundles. The library validates manifest schema, hashes, transform chains, and evidence references to guarantee the integrity of PDF/HTML exports and associated exhibits.

## Usage

```bash
ig-manifest verify ./path/to/export --json
```

Programmatic API:

```ts
import { verifyManifest } from "@intelgraph/prov-manifest";

const report = await verifyManifest("./export-dir");
if (!report.valid) {
  console.error(report.issues);
}
```

## Tests

```bash
npm test
```
