# @intelgraph/summit-cultural

Cultural-Demographic-Linguistic Reality Modeling (CDLRM) primitives for Summit.

## Included modules

- `schema/culturalReality.schema.json`: seed schema for Cultural Reality Graph ingest.
- `validation.ts`: runtime validation and bounded-score guards with strict typed parsers.
- `narrativeCompatibility.ts`: deterministic compatibility scoring for narrative/population fit.
- `diffusionEngine.ts`: ranked narrative diffusion map generation with normalized weights.
- `fixtures/sampleScenario.ts`: reproducible scenario fixture.
- `test/diffusionEngine.test.mjs`: build-artifact based deterministic test suite.

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

## Development checks

```bash
pnpm --filter @intelgraph/summit-cultural typecheck
pnpm --filter @intelgraph/summit-cultural test
```

## MAESTRO alignment

- **Layers**: Data, Agents, Observability, Security.
- **Threats considered**: Narrative injection, translated-propaganda spoofing, malformed demographic priors.
- **Mitigations**: deterministic scoring, explicit linguistic authenticity penalty, input validation, deterministic test fixtures.
