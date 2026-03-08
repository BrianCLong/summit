import test from 'node:test';
import assert from 'node:assert/strict';

import { buildNarrativeDiffusionMap } from '../diffusionEngine.js';
import {
  sampleNarrative,
  samplePopulations,
  sampleSignal,
} from '../fixtures/sampleScenario.js';

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
