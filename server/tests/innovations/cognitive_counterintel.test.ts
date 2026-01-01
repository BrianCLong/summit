import { test } from 'node:test';
import assert from 'node:assert';
import { PythiaService } from '../../src/services/PythiaService.js';
import { DecoyGraphService } from '../../src/services/DecoyGraphService.js';

test('PythiaService Simulation', async () => {
  const pythia = PythiaService.getInstance();
  const result = await pythia.simulateIntervention({
    name: 'Test Sim',
    targetNodeId: 'node-1',
    interventionType: 'TAKEDOWN',
    durationHours: 24
  });

  assert.ok(result.predictedImpactScore >= 0);
  assert.ok(result.confidenceInterval[0] <= result.confidenceInterval[1]);
});

test('DecoyGraphService Generation', () => {
  const decoy = DecoyGraphService.getInstance();
  const cypher = decoy.generateDecoyCypher(10, 'test-seed');
  assert.match(cypher, /CREATE \(n:DecoyEntity/);
  assert.match(cypher, /_decoy: true/);
});

test('DecoyGraphService Detection', () => {
  const decoy = DecoyGraphService.getInstance();
  const isDecoy = decoy.checkDecoyAccess({
    properties: { id: 'd1', _decoy: true }
  });
  assert.strictEqual(isDecoy, true);

  const isReal = decoy.checkDecoyAccess({
    properties: { id: 'r1', _decoy: false }
  });
  assert.strictEqual(isReal, false);
});
