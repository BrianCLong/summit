# Canonical Semantic Schema Mapper (CSSM)

CSSM aligns heterogeneous source schemas and SaaS application payloads with the
Summit canonical business ontology. It combines rule-based heuristics with
deterministic embedding hints to deliver:

- Schema annotations with canonical entities, metrics, and units.
- Compatibility matrices that highlight safe joins and expose mismatches.
- A migration aide that summarizes required normalization steps by system.

## Usage

```bash
python -m tools.cssm \
  tools/cssm/samples/seeded_corpora.json \
  --output tmp/cssm
```

This command produces three artifacts inside `tmp/cssm/`:

1. `schema_annotations.json` – canonical mappings for each source field,
   including rule evidence, embedding similarity, and confidence scores.
2. `compatibility_matrix.json` – pairwise compatibility signals with
   explanations for mismatched joins.
3. `migration_aide.md` – narrative aide summarizing actions per source system.

Use `--ontology` to point at an alternate ontology definition if required.

## TypeScript integration

The deterministic scoring logic is also exposed for Node.js tooling in
`tools/cssm/ts/mapper.ts`:

```ts
import { mapSystems } from './tools/cssm/ts/mapper';

const { schema_annotations } = mapSystems(systemsFromSomewhere);
```

Both implementations share the same ontology and hashing rules, ensuring
consistent results across runtime environments.

## Determinism

CSSM avoids randomness by relying on hash-based embeddings and deterministic
rule ordering. Identical inputs always yield identical outputs.
