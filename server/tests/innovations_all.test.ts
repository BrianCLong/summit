import { test, expect } from '@jest/globals';
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
  expect(result.predictedImpactScore).toBeGreaterThanOrEqual(0);
});

test('DecoyGraphService Generation', () => {
  const decoy = DecoyGraphService.getInstance();
  const cypher = decoy.generateDecoyCypher(10, 'test-seed');
  expect(cypher).toMatch(/CREATE \(n:DecoyEntity/);
});

test('AutoImmunizerService Blocking', () => {
  const immunizer = AutoImmunizerService.getInstance();
  const ip = '10.0.0.1';
  expect(immunizer.isBlocked(ip)).toBe(false);
  immunizer.createBlockRule(ip, 1);
  expect(immunizer.isBlocked(ip)).toBe(true);
});

test('TransparencyLogService Merkle', () => {
  const log = TransparencyLogService.getInstance();
  log.addEntry('data1');
  const root = log.getRoot();
  expect(root.length).toBeGreaterThan(0);
});

test('EvidenceDroid Collection', async () => {
  const droid = EvidenceDroidService.getInstance();
  const evidence = await droid.collectEvidence('SOC2-CC6.1');
  expect(evidence.controlId).toBe('SOC2-CC6.1');
});

test('Council Consensus', async () => {
  const council = CouncilService.getInstance();
  const res = await council.requestConsensus('Deploy benign feature');
  expect(res.approved).toBe(true);
});

test('Plugin Weaver Piping', async () => {
  const weaver = PluginWeaverService.getInstance();
  let received = '';
  weaver.registerPipe('test.event', async (d) => { received = d.msg; return d; });
  await weaver.emit('test.event', { msg: 'hello' });
  expect(received).toBe('hello');
});
