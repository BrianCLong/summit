# Connector Contracts in 20 Minutes

This guide walks through the additive connector contract harness that ships with two reference connectors (`team-roster-sample` and `alert-mini`). The harness is off by default and is only activated when `CONNECTOR_CONTRACTS=1` is present.

## Quickstart

1. Copy the template manifest below into a new folder under `connectors/contracts/reference/<your-connector>`.
2. Add a sample fixture and a golden snapshot that reflects your normalized entities and provenance chain.
3. Implement `mapper.js` with a `buildNormalizedOutput(fixture, manifest, fixturePath)` export.
4. Run the golden suite:

```bash
CONNECTOR_CONTRACTS=1 node tests/connector-contracts/run-golden-tests.js
```

You’ll get a crisp summary of how many manifests passed, failed, or were skipped.
Alternatively, use the packaged script:

```bash
pnpm test:connector-contracts
```

## Manifest template (v1)

```json
{
  "$schema": "../../schema/connector.manifest.v1.schema.json",
  "schemaVersion": "v1",
  "connectorId": "my-connector",
  "name": "My Connector",
  "description": "What this connector ingests",
  "version": "1.0.0",
  "owner": "team-name",
  "tags": ["reference"],
  "source": {
    "type": "file",
    "endpoint": "./fixtures/sample.json",
    "contentType": "json",
    "owner": "upstream-owner"
  },
  "auth": { "type": "none" },
  "rateLimits": { "requestsPerMinute": 60, "concurrency": 1 },
  "license": { "classification": "internal", "terms": "demo-only" },
  "pii": {
    "fields": [{ "field": "email", "category": "high", "policy": "mask" }]
  },
  "mapping": {
    "handler": "./mapper.js",
    "hints": [
      {
        "source": "records[].id",
        "targetType": "Entity",
        "idField": "id",
        "nameField": "name",
        "provenanceTag": "row"
      }
    ]
  },
  "fixtures": {
    "sample": "./fixtures/sample.json",
    "golden": "./fixtures/golden.v1.json",
    "description": "Happy-path sample"
  },
  "contracts": {
    "snapshotVersion": "my-connector.v1",
    "generatedAt": "2025-02-05T00:00:00Z",
    "outputSchemaVersion": "canonical.v1"
  }
}
```

## Writing a mapper

Your `mapper.js` should:

- Apply PII policies from `manifest.pii.fields` (mask/drop as needed).
- Map the raw fixture into canonical `entities`, `relationships`, and a `provenance` chain.
- Return a deterministic object with `snapshotVersion`, `generatedAt`, and `outputSchemaVersion` copied from the manifest.

Example shape:

```js
module.exports.buildNormalizedOutput = (fixture, manifest, fixturePath) => ({
  snapshotVersion: manifest.contracts.snapshotVersion,
  generatedAt: manifest.contracts.generatedAt,
  connectorId: manifest.connectorId,
  outputSchemaVersion: manifest.contracts.outputSchemaVersion,
  entities: [],
  relationships: [],
  provenance: [],
});
```

## CI expectations

- Manifest validation is enforced via Jest; invalid manifests fail fast.
- Golden snapshots are versioned (`snapshotVersion`, `generatedAt`) to prevent flaky timestamps.
- The harness is additive—existing ingestion paths remain untouched when `CONNECTOR_CONTRACTS` is unset.
