# Provenance Ledger & Training Capsules

The provenance ledger package now ships an immutable training capsule system designed for
end-to-end traceability of machine-learning datasets and the models derived from them.

## Training Capsules Overview

* **Content-addressed storage** – datasets are ingested into the `CapsuleStorageEngine`, which
  fingerprints payloads with SHA-256 hashes and stores buffers under their content hash. Any
  attempted modification changes the hash and is rejected by `verifyCapsuleIntegrity`.
* **Immutable transformation audit trail** – the `CapsuleVersioningAPI` records every preprocessing
  step with cryptographic linking (`previousHash` + `transformationHash`). Chain verification detects
  tampering.
* **Reproducible snapshots** – `createSnapshot` produces deterministic snapshot identifiers derived
  from the dataset hash, ordered transformations, and training/runtime configuration. Snapshots are
  chained to previous runs to provide historical lineage.
* **Model registry integration** – link trained model artifacts directly to the snapshot that produced
  them via `linkModelToSnapshot`. Lineage graphs will surface these relationships automatically.
* **Differential privacy & compliance attestations** – capsule metadata can include DP guarantees
  (epsilon/delta/mechanism) and compliance attestations with audit artefacts for downstream
  governance.

## Generating Lineage Graphs

Use the `LineageGraphGenerator` to visualise lineage around a dataset capsule or a registered model:

```ts
const storage = new CapsuleStorageEngine();
const versioning = new CapsuleVersioningAPI(storage);
// ...ingest data, record transformations, create snapshots, link models...
const generator = new LineageGraphGenerator(versioning);
const graph = generator.generate({ modelId: 'models/churn/v1' });
```

`graph.nodes` and `graph.edges` return a structured representation suitable for dashboards, DOT
renderers, or governance reports.

## Testing

Run the Vitest suite from this package to validate ledger behaviour, capsule immutability, and model
registry linkage:

```bash
npm test
```
