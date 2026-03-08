import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { CounterfactualLab } from '../../agentic_web_visibility/geo/src/scoring/counterfactual.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('CounterfactualLab loads fixtures and calculates deltas', async () => {
    const lab = new CounterfactualLab();
    const fixturePath = path.join(__dirname, '../../agentic_web_visibility/geo/GOLDEN/datasets/geo-counterfactual-fixtures.jsonl');

    const fixtures = await lab.loadFixtures(fixturePath);
    assert.strictEqual(fixtures.length, 2);

    const deltas = lab.calculateDeltas(fixtures);
    assert.strictEqual(deltas.length, 2);

    const statDelta = deltas.find(d => d.scenarioId === 'add_statistic');
    assert.ok(statDelta);
    // baseline: 0.35 -> treatment: 0.7 (delta = 0.35)
    assert.ok(Math.abs(statDelta.averageSelectionLift - 0.35) < 0.001);
});
