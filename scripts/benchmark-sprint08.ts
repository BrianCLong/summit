
import { performance } from 'perf_hooks';
import { getPolicySimulator } from '../server/src/analytics/policy/PolicySimulator.ts';
import { receiptService } from '../server/src/services/ReceiptService.ts';

async function benchmark() {
  console.log('--- Sprint 08 Performance Benchmark ---');

  // 1. Policy Simulation p95
  const simulator = getPolicySimulator();
  const simTimes: number[] = [];
  for (let i = 0; i < 50; i++) {
    const start = performance.now();
    await simulator.simulate({
      tenantId: 'bench-tenant',
      changes: [{ id: '1', type: 'add', description: 'test', after: { id: 'r1', action: 'allow', priority: 1, resource: '*', subjects: ['*'], condition: '', name: 'test' } }]
    });
    simTimes.push(performance.now() - start);
  }
  const p95Sim = simTimes.sort((a,b) => a-b)[Math.floor(simTimes.length * 0.95)];
  console.log(`p95 Policy Simulation: ${p95Sim.toFixed(2)}ms (Target: <150ms)`);

  // 2. Receipt Write async enqueue
  const writeTimes: number[] = [];
  for (let i = 0; i < 50; i++) {
    const start = performance.now();
    // generateReceipt is now async but the evidence write is enqueued
    await receiptService.generateReceipt({
      action: 'bench.action',
      actor: { id: 'u1', tenantId: 't1' },
      resource: 'r1',
      input: { data: 'test' }
    });
    writeTimes.push(performance.now() - start);
  }
  const p95Write = writeTimes.sort((a,b) => a-b)[Math.floor(writeTimes.length * 0.95)];
  console.log(`p95 Receipt Write (enqueue): ${p95Write.toFixed(2)}ms (Target: <200ms)`);

  console.log('--- Benchmark Complete ---');
}

benchmark().catch(console.error);
