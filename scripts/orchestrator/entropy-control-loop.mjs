#!/usr/bin/env node

/**
 * Entropy Control Loop - Integrated Monitor + Actuator
 *
 * Demonstrates the full control-loop integration:
 * 1. Entropy monitor detects threshold breaches
 * 2. Generates evidence artifacts
 * 3. Triggers actuator for control actions
 * 4. Actuator executes policy-driven interventions
 *
 * This is entropy as ACTUATOR, not just observation.
 */

import { FrontierEntropyMonitor } from '../../services/repoos/frontier-entropy.mjs';
import { EntropyActuator } from '../../services/repoos/entropy-actuator.mjs';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         Entropy Control Loop - Integration Demo              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Initialize actuator
  console.log('Phase 1: Initializing actuator...');
  const actuator = new EntropyActuator({ dryRun: process.env.DRY_RUN !== 'false' });
  await actuator.initialize();

  // Initialize monitor with actuator integration
  console.log('Phase 2: Initializing entropy monitor with actuator...');
  const monitor = new FrontierEntropyMonitor({ actuator });
  await monitor.initialize();

  // Generate test samples with escalating entropy
  console.log('Phase 3: Generating test samples...\n');

  const scenarios = [
    { name: 'Normal operations', patches: 2, conflicts: 0, merges: 2 },
    { name: 'Moderate activity', patches: 5, conflicts: 1, merges: 4 },
    { name: 'Elevated activity', patches: 10, conflicts: 3, merges: 8 },
    { name: 'High activity', patches: 15, conflicts: 5, merges: 12 },
    { name: 'Critical chaos', patches: 25, conflicts: 10, merges: 20, rollbacks: 5 }
  ];

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    console.log(`Scenario ${i + 1}: ${scenario.name}`);

    const state = {
      patches: scenario.patches + Math.floor(Math.random() * 3),
      conflicts: scenario.conflicts + Math.floor(Math.random() * 2),
      merges: scenario.merges + Math.floor(Math.random() * 3),
      rollbacks: (scenario.rollbacks || 0) + Math.floor(Math.random() * 2),
      locks: Math.floor(Math.random() * 3),
      releases: Math.floor(Math.random() * 2)
    };

    // This will trigger actuator if assessment crosses thresholds
    await monitor.recordSample(state);

    const sample = monitor.lastSample;
    console.log(`  Entropy: ${sample.entropy.toFixed(4)}`);
    console.log(`  Velocity: ${sample.velocity !== null ? sample.velocity.toFixed(6) : 'N/A'}`);
    console.log(`  Assessment: ${sample.assessment.toUpperCase()}\n`);

    // Small delay between samples
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Generate final reports
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Phase 4: Generating reports...\n');

  await monitor.printReport();
  await actuator.printActuationReport();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('CONTROL LOOP INTEGRATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('Evidence Artifacts:');
  console.log('  Entropy Report:  artifacts/repoos/frontier-entropy/report.json');
  console.log('  Entropy Stamp:   artifacts/repoos/frontier-entropy/stamp.json');
  console.log('  Action Log:      artifacts/repoos/entropy-actions/actions.log');
  console.log('  Audit Trail:     artifacts/repoos/entropy-actions/audit.json\n');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
