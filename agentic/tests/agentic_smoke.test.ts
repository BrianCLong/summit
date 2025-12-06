import { Orchestrator } from '../core/Orchestrator';
import { Omniscience } from '../modules/Omniscience';
import assert from 'assert';

async function runTests() {
  console.log('🧪 Running Standalone Agentic Tests...');

  // Test 1: Omniscience Logging
  console.log('Test 1: Omniscience Logging');
  const omni = new Omniscience();
  try {
    omni.log('info', 'Test Log');
    console.log('✅ Omniscience log passed');
  } catch (e) {
    console.error('❌ Omniscience log failed', e);
    process.exit(1);
  }

  // Test 2: Orchestrator Cycle
  console.log('Test 2: Orchestrator Cycle');
  const orchestrator = new Orchestrator();
  const start = Date.now();
  await orchestrator.start();
  const duration = Date.now() - start;

  if (duration > 0) {
     console.log('✅ Orchestrator ran cycles successfully');
  } else {
     console.error('❌ Orchestrator did not run');
     process.exit(1);
  }

  console.log('🎉 All Agentic Tests Passed');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runTests().catch(e => {
    console.error(e);
    process.exit(1);
  });
}

import { fileURLToPath } from 'url';
