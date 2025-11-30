# Schema-Aware Ingest Wizard

Web wizard for mapping arbitrary CSV/JSON to canonical entities with PII detection, lineage tracking, and redaction presets.

## Features

- ✅ AI-assisted field mapping (rule-based)
- ✅ PII detection (SSN, email, phone, credit card)
- ✅ License/TOS capture per dataset
- ✅ Per-row lineage recording
- ✅ Redaction presets: NONE, HASH, MASK, REMOVE

## Usage

```typescript
import { SchemaMapper } from '@intelgraph/schema-ingest-wizard';

const wizard = new SchemaMapper();
const headers = ['name', 'ssn', 'company'];
const sample = [{ name: 'Alice', ssn: '123-45-6789', company: 'ACME' }];

// Suggest mappings
const mappings = wizard.suggestMappings(headers, sample);
console.log(mappings);
// [
//   { sourceField: 'name', targetField: 'name', entityType: 'Person', isPII: false },
//   { sourceField: 'ssn', targetField: 'ssn', entityType: 'Person', isPII: true },
//   ...
// ]

// Ingest with redaction
const entities = wizard.ingest(sample, {
  datasetName: 'dataset-001',
  license: 'license-xyz',
  tos: 'tos-url',
  mappings,
  redactionPreset: 'HASH',
});
```

Acceptance: Map CSV in ≤10 minutes with automated PII flagging and lineage.
