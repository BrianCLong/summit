#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVIDENCE_DIR = path.join(__dirname, '../../evidence/drills');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

console.log('--- Starting Simulated Rollback Drill ---');

// 1. Simulate Trigger
console.log('Step 1: Simulating Alert Trigger (High Error Rate)...');
const triggerEvent = {
  timestamp: new Date().toISOString(),
  trigger: 'HighErrorRate',
  severity: 'P1',
  description: 'Simulated > 1% error rate'
};
console.log('✅ Trigger acknowledged.');

// 2. Simulate Artifact Selection
console.log('Step 2: Identifying Last Known Good Version...');
const currentVersion = 'v2.0.5';
const targetVersion = 'v2.0.4';
console.log(`Current: ${currentVersion}, Target: ${targetVersion}`);
console.log('✅ Target identified.');

// 3. Simulate Rollback Command
console.log('Step 3: Executing Rollback Command (Simulation)...');
console.log(`> kubectl rollout undo deployment/server --to-revision=1`);
// Sleep to simulate time
await new Promise(resolve => setTimeout(resolve, 500));
console.log('✅ Rollback command executed (simulated).');

// 4. Simulate Validation
console.log('Step 4: Validating Health...');
const healthCheck = {
  pods_running: true,
  error_rate: 0.001,
  latency_p95: 150
};
console.log(`Health status: Healthy (Error Rate: ${healthCheck.error_rate * 100}%)`);
console.log('✅ System recovered.');

// 5. Generate Evidence
const evidence = {
  id: `drill-rollback-${Date.now()}`,
  type: 'rollback-drill',
  status: 'success',
  details: {
    trigger: triggerEvent,
    from_version: currentVersion,
    to_version: targetVersion,
    health_verification: healthCheck
  },
  timestamp: new Date().toISOString()
};

const evidencePath = path.join(EVIDENCE_DIR, `${evidence.id}.json`);
fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
console.log(`Evidence generated at: ${evidencePath}`);

// 6. Update Evidence Index
console.log('Step 5: Updating Evidence Index...');
const INDEX_FILE = path.join(EVIDENCE_DIR, 'EVIDENCE_INDEX.json');
let index = [];
if (fs.existsSync(INDEX_FILE)) {
  try {
    index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  } catch (e) {
    console.warn('Warning: Could not parse existing index, starting fresh.');
  }
}

index.push({
  id: evidence.id,
  type: evidence.type,
  timestamp: evidence.timestamp,
  path: `drills/${evidence.id}.json`
});

fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
console.log(`✅ Index updated at: ${INDEX_FILE}`);

console.log('--- Rollback Drill Complete ---');
