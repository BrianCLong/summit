import test from 'node:test';
import assert from 'node:assert/strict';

import { buildNarrativeDiffusionMap, scoreNarrativeCompatibility } from '../dist/index.js';
import {
  sampleNarrative,
  samplePopulations,
  sampleSignal,
} from '../dist/fixtures/sampleScenario.js';

test('buildNarrativeDiffusionMap ranks culturally aligned populations first', () => {
  const map = buildNarrativeDiffusionMap({
    populations: samplePopulations,
    narrative: sampleNarrative,
    signal: sampleSignal,
    demographicSusceptibility: {
      'polish-youth-urban': 0.45,
      'slovak-rural-energy-workers': 0.9,
      'nordic-urban-professionals': 0.2,
    },
  });

  assert.equal(map[0].populationId, 'slovak-rural-energy-workers');
  assert.equal(map[map.length - 1].populationId, 'nordic-urban-professionals');
  assert.ok(map[0].adoptionLikelihood > map[1].adoptionLikelihood);
});

test('scoreNarrativeCompatibility normalizes custom weights deterministically', () => {
  const result = scoreNarrativeCompatibility(
    samplePopulations[1],
    sampleNarrative,
    sampleSignal,
    {
      weights: {
        valueAlignment: 7,
        linguisticAuthenticity: 2,
        historicalResonance: 1,
        mediaDistributionFit: 0,
      },
    },
  );

  assert.equal(result.score, 1);
  assert.equal(result.breakdown.mediaDistributionFit, 1);
});

test('buildNarrativeDiffusionMap rejects invalid susceptibility values', () => {
  assert.throws(() => {
    buildNarrativeDiffusionMap({
      populations: samplePopulations,
      narrative: sampleNarrative,
      signal: sampleSignal,
      demographicSusceptibility: {
        'slovak-rural-energy-workers': 1.2,
      },
    });
  });
});
