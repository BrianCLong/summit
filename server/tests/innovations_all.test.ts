import { test } from 'node:test';
import assert from 'node:assert';
import { PythiaService } from '../src/services/PythiaService.js';
import { DecoyGraphService } from '../src/services/DecoyGraphService.js';
import { AutoImmunizerService } from '../src/security/AutoImmunizer.js';
import { TransparencyLogService } from '../src/services/TransparencyLogService.js';
import { EvidenceDroidService } from '../src/services/EvidenceDroidService.js';
import { CouncilService } from '../src/services/CouncilService.js';
import { PluginWeaverService } from '../src/services/PluginWeaverService.js';

test('PythiaService Simulation', async () => {
  const pythia = PythiaService.getInstance();
  const result = await pythia.simulateIntervention({
    name: 'Test Sim',
    targetNodeId: 'node-1',
    interventionType: 'TAKEDOWN',
    durationHours: 24
  });
  assert.ok(result.predictedImpactScore >= 0);
});

test('DecoyGraphService Generation', () => {
  const decoy = DecoyGraphService.getInstance();
  const cypher = decoy.generateDecoyCypher(10, 'test-seed');
  assert.match(cypher, /CREATE \(n:DecoyEntity/);
});

test('AutoImmunizerService Blocking', () => {
  const immunizer = AutoImmunizerService.getInstance();
  const ip = '10.0.0.1';
  assert.strictEqual(immunizer.isBlocked(ip), false);
  immunizer.createBlockRule(ip, 1);
  assert.strictEqual(immunizer.isBlocked(ip), true);
});

test('TransparencyLogService Merkle', () => {
  const log = TransparencyLogService.getInstance();
  log.addEntry('data1');
  const root = log.getRoot();
  assert.ok(root.length > 0);
});

test('EvidenceDroid Collection', async () => {
  const droid = EvidenceDroidService.getInstance();
  const evidence = await droid.collectEvidence('SOC2-CC6.1');
  assert.strictEqual(evidence.controlId, 'SOC2-CC6.1');
});

test('Council Consensus', async () => {
  const council = CouncilService.getInstance();
  const res = await council.requestConsensus('Deploy benign feature');
  assert.strictEqual(res.approved, true);
});

test('Plugin Weaver Piping', async () => {
  const weaver = PluginWeaverService.getInstance();
  let received = '';
  weaver.registerPipe('test.event', async (d) => { received = d.msg; return d; });
  await weaver.emit('test.event', { msg: 'hello' });
  assert.strictEqual(received, 'hello');
});
