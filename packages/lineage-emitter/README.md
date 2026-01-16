# @intelgraph/lineage-emitter

Deterministic OpenLineage emitter for Summit pipelines. It creates stable, schema-validated
OpenLineage events and writes them to `artifacts/lineage/<sha>/openlineage.json` with canonical
ordering.

## Determinism Guarantees

- No network calls.
- No UUID v4 or runtime timestamps.
- Arrays and object keys are canonically sorted before hashing and emission.
- `eventTime` is pinned to a constant value to avoid nondeterministic payloads.

## Usage

```ts
import {
  emitOpenLineageArtifact,
  type OpenLineageEmissionInput,
} from '@intelgraph/lineage-emitter';

const input: OpenLineageEmissionInput = {
  jobName: 'summit-data-pipeline',
  runId: 'run-0001',
  inputs: [{ namespace: 'summit', name: 'source.csv' }],
  outputs: [{ namespace: 'summit', name: 'warehouse.table' }],
};

await emitOpenLineageArtifact(input);
```

## Schema Validation

Runtime validation is enforced via `schemas/openlineage-event.schema.json`. The emitter throws on
any schema validation failure prior to writing artifacts.
