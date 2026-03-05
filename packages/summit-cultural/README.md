# @intelgraph/summit-cultural

Cultural-Demographic-Linguistic Reality Modeling (CDLRM) primitives for Summit.

## Included modules

- `schema/culturalReality.schema.json`: seed schema for Cultural Reality Graph ingest.
- `narrativeCompatibility.ts`: compatibility scoring for narrative/population fit.
- `diffusionEngine.ts`: ranked narrative diffusion map generation.
- `fixtures/sampleScenario.ts`: reproducible scenario fixture.
- `golden-tests/diffusionEngine.test.ts`: golden path confidence test.

## Usage

```ts
import { buildNarrativeDiffusionMap } from '@intelgraph/summit-cultural';
import {
  sampleNarrative,
  samplePopulations,
  sampleSignal,
} from './src/fixtures/sampleScenario.js';

const map = buildNarrativeDiffusionMap({
  populations: samplePopulations,
  narrative: sampleNarrative,
  signal: sampleSignal,
});
```

## MAESTRO alignment

- **Layers**: Data, Agents, Observability.
- **Threats considered**: Narrative injection, translated-propaganda spoofing, demographic overfitting.
- **Mitigations**: Deterministic weighted scoring, explicit linguistic authenticity penalty, reproducible fixtures.
