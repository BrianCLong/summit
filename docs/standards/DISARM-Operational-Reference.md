# DISARM Operational Reference

This document outlines the DISARM (Disinformation Analysis and Risk Management) taxonomy implementation within the IntelGraph platform.

## Package

The canonical taxonomy is maintained in the `@intelgraph/disarm` package. It provides a type-safe, validated loader for the DISARM framework subset used by our detectors and agents.

## Usage

```typescript
import { loadDisarmTaxonomy } from '@intelgraph/disarm';

const taxonomy = loadDisarmTaxonomy();

// Access techniques
const techniques = taxonomy.techniques;
console.log(techniques[0].technique_name);
```

## Evidence and Determinism

The taxonomy is versioned and produces a deterministic JSON output. This output is used for evidence chains in Moat capabilities.

The current evidence artifact can be found at: `docs/evidence/moat/PR-0-disarm-taxonomy.evidence.json`.

## Taxonomy Structure

The implementation follows a subset of the DISARM Red Framework:

- **Tactic**: High-level operational phase (e.g., "Plan and Prepare", "Pump and Prime").
- **Technique**: Specific operational method (e.g., "Create Inauthentic Accounts").
- **Observables**: Specific indicators or signals that suggest the technique is being used.
- **Mitigations**: Recommended defensive actions or detection strategies.

## Verification

To verify the integrity of the taxonomy:

1. Run the evidence generation script:
   ```bash
   pnpm --filter @intelgraph/disarm run generate:evidence
   ```
2. Compare the output hash with the stored evidence artifact.
