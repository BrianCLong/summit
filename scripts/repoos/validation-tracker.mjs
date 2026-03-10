#!/usr/bin/env node
/**
 * Stage 7 Validation Tracker
 *
 * Monitors progress on all 5 validation gates for transitioning
 * from Stage 7.0-C (Capability Complete) to Stage 7.0-O (Operationally Validated).
 *
 * Beyond FAANG Innovation: Evidence-based operational validation framework
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Load validation status
 */
async function loadValidationStatus() {
  try {
    const content = await fs.readFile('.repoos/validation-status.json', 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Initialize if not exists
    return {
      last_updated: new Date().toISOString(),
      maturity_level: '7.0-C',
      target_maturity: '7.0-O',
      target_date: '2026-07-15',
      gates: {
        gate_1: {
          name: 'Simulator Backtest Pack',
          status: 'not_started',
          target_date: '2026-04-20',
          progress: 0,
          evidence_files: [],
          acceptance_criteria: [
            { criterion: 'MAPE < 20% for all metrics', status: 'pending' },
            { criterion: 'Confidence intervals 85%+ coverage', status: 'pending' },
            { criterion: '2+ intervention validations', status: 'pending' }
          ]
        },
        gate_2: {
          name: 'Patch-Market Replay Study',
          status: 'not_started',
          target_date: '2026-04-06',
          progress: 0,
          evidence_files: [],
          acceptance_criteria: [
            { criterion: 'Lead time improvement ≥ 15%', status: 'pending' },
            { criterion: 'Regression reduction ≥ 20%', status: 'pending' },
            { criterion: 'Zero starvation in top quartile', status: 'pending' }
          ]
        },
        gate_3: {
          name: 'Governance Bypass Game Day',
          status: 'not_started',
          target_date: '2026-03-23',
          progress: 0,
          evidence_files: [],
          acceptance_criteria: [
            { criterion: '100% bypass rejection without auth', status: 'pending' },
            { criterion: 'Override workflow validated', status: 'pending' },
            { criterion: 'Audit log integrity verified', status: 'pending' }
          ]
        },
        gate_4: {
          name: 'Synthesis Safety Trial',
          status: 'not_started',
          target_date: '2026-04-27',
          progress: 0,
          evidence_files: [],
          acceptance_criteria: [
            { criterion: 'Cluster precision ≥ 80%', status: 'pending' },
            { criterion: 'False merge rate < 5%', status: 'pending' },
            { criterion: 'Rollback rate < 5%', status: 'pending' },
            { criterion: 'Blast radius < 10%', status: 'pending' }
          ]
        },
        gate_5: {
          name: '30-Day Operational Soak',
          status: 'not_started',
          target_date: '2026-05-11',
          progress: 0,
          evidence_files: [],
          acceptance_criteria: [
            { criterion: '90%+ uptime for all components', status: 'pending' },
            { criterion: 'Stability bounds 90%+ of time', status: 'pending' },
            { criterion: 'Zero unrecovered critical incidents', status: 'pending' },
            { criterion: 'Alert false positive rate < 5%', status: 'pending' }
          ]
        }
      },
      overall_progress: 0,
      blockers: [],
      recent_activity: []
    };
  }
}

/**
 * Save validation status
 */
async function saveValidationStatus(status) {
  status.last_updated = new Date().toISOString();
  await fs.mkdir('.repoos', { recursive: true });
  await fs.writeFile('.repoos/validation-status.json', JSON.stringify(status, null, 2));
}

/**
 * Compute overall progress
 */
function computeOverallProgress(status) {
  const gates = Object.values(status.gates);
  const totalProgress = gates.reduce((sum, gate) => sum + gate.progress, 0);
  return totalProgress / gates.length;
}

/**
 * Get gate status emoji
 */
function getStatusEmoji(status) {
  switch (status) {
    case 'completed': return '✅';
    case 'in_progress': return '🔄';
    case 'blocked': return '🔴';
    case 'not_started': return '⏳';
    default: return '⚪';
  }
}

/**
 * Get criterion status emoji
 */
function getCriterionEmoji(status) {
  switch (status) {
    case 'passed': return '✅';
    case 'failed': return '❌';
    case 'pending': return '⏳';
    default: return '⚪';
  }
}

/**
 * Display validation dashboard
 */
function displayDashboard(status) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║        Stage 7 Validation Tracker                             ║');
  console.log('║        7.0-C → 7.0-O Progression                              ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Overall progress
  const progress = computeOverallProgress(status);
  const progressBar = '█'.repeat(Math.floor(progress / 2.5)) + '░'.repeat(40 - Math.floor(progress / 2.5));

  console.log(`Current Maturity: ${status.maturity_level}`);
  console.log(`Target Maturity: ${status.target_maturity}`);
  console.log(`Target Date: ${status.target_date}`);
  console.log(`\nOverall Progress: ${progress.toFixed(1)}%`);
  console.log(progressBar);
  console.log('');

  // Gates
  console.log('━━━ Validation Gates ━━━\n');

  for (const [gateId, gate] of Object.entries(status.gates)) {
    const statusEmoji = getStatusEmoji(gate.status);
    const gateProgress = '█'.repeat(Math.floor(gate.progress / 5)) + '░'.repeat(20 - Math.floor(gate.progress / 5));

    console.log(`${statusEmoji} ${gate.name}`);
    console.log(`   Status: ${gate.status.replace('_', ' ').toUpperCase()}`);
    console.log(`   Progress: ${gate.progress}% ${gateProgress}`);
    console.log(`   Target: ${gate.target_date}`);

    if (gate.evidence_files.length > 0) {
      console.log(`   Evidence: ${gate.evidence_files.length} file(s) collected`);
    }

    // Show acceptance criteria
    const passedCriteria = gate.acceptance_criteria.filter(c => c.status === 'passed').length;
    const totalCriteria = gate.acceptance_criteria.length;
    console.log(`   Criteria: ${passedCriteria}/${totalCriteria} passed`);

    for (const criterion of gate.acceptance_criteria) {
      const emoji = getCriterionEmoji(criterion.status);
      console.log(`     ${emoji} ${criterion.criterion}`);
    }

    console.log('');
  }

  // Blockers
  if (status.blockers.length > 0) {
    console.log('━━━ Blockers ━━━\n');
    for (const blocker of status.blockers) {
      console.log(`🔴 ${blocker.gate}: ${blocker.description}`);
      console.log(`   Added: ${blocker.timestamp}`);
      console.log('');
    }
  }

  // Recent activity
  if (status.recent_activity.length > 0) {
    console.log('━━━ Recent Activity ━━━\n');
    for (const activity of status.recent_activity.slice(0, 5)) {
      console.log(`${activity.timestamp.split('T')[0]} - ${activity.description}`);
    }
    console.log('');
  }

  // Next actions
  console.log('━━━ Next Actions ━━━\n');

  const notStartedGates = Object.entries(status.gates)
    .filter(([_, gate]) => gate.status === 'not_started')
    .sort((a, b) => new Date(a[1].target_date) - new Date(b[1].target_date));

  if (notStartedGates.length > 0) {
    const [nextGateId, nextGate] = notStartedGates[0];
    console.log(`🎯 Next Priority: ${nextGate.name}`);
    console.log(`   Target: ${nextGate.target_date}`);
    console.log(`   Days until target: ${Math.ceil((new Date(nextGate.target_date) - new Date()) / (1000 * 60 * 60 * 24))}`);
    console.log('');
  }

  const inProgressGates = Object.entries(status.gates)
    .filter(([_, gate]) => gate.status === 'in_progress');

  if (inProgressGates.length > 0) {
    console.log('Currently in progress:');
    for (const [gateId, gate] of inProgressGates) {
      console.log(`  - ${gate.name} (${gate.progress}%)`);
    }
    console.log('');
  }
}

/**
 * Check evidence files exist
 */
async function checkEvidenceFiles(status) {
  for (const [gateId, gate] of Object.entries(status.gates)) {
    gate.evidence_files = [];

    const evidenceDir = '.repoos/validation';
    try {
      const files = await fs.readdir(evidenceDir);
      const gateFiles = files.filter(f => f.includes(gateId.replace('_', '-')));
      gate.evidence_files = gateFiles;

      // Update progress based on evidence
      if (gateFiles.length > 0 && gate.progress === 0) {
        gate.progress = 10; // Some progress if files exist
      }
    } catch (error) {
      // Directory doesn't exist yet
    }
  }
}

/**
 * Add activity log
 */
function addActivity(status, description) {
  status.recent_activity.unshift({
    timestamp: new Date().toISOString(),
    description
  });

  // Keep only last 20 activities
  if (status.recent_activity.length > 20) {
    status.recent_activity = status.recent_activity.slice(0, 20);
  }
}

/**
 * Update gate status
 */
async function updateGateStatus(gateId, updates) {
  const status = await loadValidationStatus();

  if (!status.gates[gateId]) {
    console.error(`Unknown gate: ${gateId}`);
    process.exit(1);
  }

  const gate = status.gates[gateId];

  if (updates.status) {
    gate.status = updates.status;
    addActivity(status, `${gate.name}: status changed to ${updates.status}`);
  }

  if (updates.progress !== undefined) {
    gate.progress = updates.progress;
    addActivity(status, `${gate.name}: progress updated to ${updates.progress}%`);
  }

  if (updates.criterion) {
    const criterion = gate.acceptance_criteria.find(c => c.criterion === updates.criterion);
    if (criterion) {
      criterion.status = updates.criterion_status;
      addActivity(status, `${gate.name}: criterion "${updates.criterion}" ${updates.criterion_status}`);
    }
  }

  status.overall_progress = computeOverallProgress(status);

  // Check if all gates completed
  const allCompleted = Object.values(status.gates).every(g => g.status === 'completed');
  if (allCompleted && status.maturity_level === '7.0-C') {
    status.maturity_level = '7.0-O';
    addActivity(status, '🎉 Stage 7.0-O (Operationally Validated) ACHIEVED!');
  }

  await saveValidationStatus(status);
  console.log(`\n✓ Updated ${gate.name}\n`);
}

/**
 * Add blocker
 */
async function addBlocker(gateId, description) {
  const status = await loadValidationStatus();

  status.blockers.push({
    gate: gateId,
    description,
    timestamp: new Date().toISOString()
  });

  status.gates[gateId].status = 'blocked';

  await saveValidationStatus(status);
  console.log(`\n⚠️  Blocker added for ${status.gates[gateId].name}\n`);
}

/**
 * Remove blocker
 */
async function removeBlocker(index) {
  const status = await loadValidationStatus();

  if (index >= 0 && index < status.blockers.length) {
    const blocker = status.blockers[index];
    status.blockers.splice(index, 1);

    // Update gate status
    const gateId = blocker.gate;
    if (status.gates[gateId] && status.gates[gateId].status === 'blocked') {
      const hasOtherBlockers = status.blockers.some(b => b.gate === gateId);
      if (!hasOtherBlockers) {
        status.gates[gateId].status = status.gates[gateId].progress > 0 ? 'in_progress' : 'not_started';
      }
    }

    await saveValidationStatus(status);
    console.log(`\n✓ Blocker removed\n`);
  } else {
    console.error('Invalid blocker index');
    process.exit(1);
  }
}

/**
 * Generate validation report
 */
async function generateReport() {
  const status = await loadValidationStatus();

  const report = {
    generated_at: new Date().toISOString(),
    maturity_level: status.maturity_level,
    target_maturity: status.target_maturity,
    overall_progress: computeOverallProgress(status),
    gates_summary: {},
    certification_readiness: 'not_ready'
  };

  for (const [gateId, gate] of Object.entries(status.gates)) {
    const passedCriteria = gate.acceptance_criteria.filter(c => c.status === 'passed').length;
    const totalCriteria = gate.acceptance_criteria.length;

    report.gates_summary[gateId] = {
      name: gate.name,
      status: gate.status,
      progress: gate.progress,
      criteria_passed: passedCriteria,
      criteria_total: totalCriteria,
      evidence_count: gate.evidence_files.length
    };
  }

  // Check certification readiness
  const allCompleted = Object.values(status.gates).every(g => g.status === 'completed');
  const allCriteriaPassed = Object.values(status.gates).every(g =>
    g.acceptance_criteria.every(c => c.status === 'passed')
  );

  if (allCompleted && allCriteriaPassed) {
    report.certification_readiness = 'ready';
  } else if (report.overall_progress > 80) {
    report.certification_readiness = 'near_ready';
  }

  await fs.mkdir('.repoos/validation', { recursive: true });
  await fs.writeFile(
    '.repoos/validation/validation-progress-report.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\n✓ Validation report generated: .repoos/validation/validation-progress-report.json\n');
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2] || 'status';

  const status = await loadValidationStatus();
  await checkEvidenceFiles(status);
  await saveValidationStatus(status);

  switch (command) {
    case 'status':
      displayDashboard(status);
      break;

    case 'update':
      const gateId = process.argv[3];
      const updateField = process.argv[4];
      const updateValue = process.argv[5];

      if (!gateId || !updateField) {
        console.error('Usage: validation-tracker.mjs update <gate_id> <field> <value>');
        console.error('Example: validation-tracker.mjs update gate_3 status in_progress');
        console.error('Example: validation-tracker.mjs update gate_3 progress 50');
        process.exit(1);
      }

      const updates = {};
      if (updateField === 'status') {
        updates.status = updateValue;
      } else if (updateField === 'progress') {
        updates.progress = parseInt(updateValue);
      } else if (updateField === 'criterion') {
        updates.criterion = updateValue;
        updates.criterion_status = process.argv[6] || 'passed';
      }

      await updateGateStatus(gateId, updates);
      break;

    case 'block':
      const blockGateId = process.argv[3];
      const blockDescription = process.argv.slice(4).join(' ');

      if (!blockGateId || !blockDescription) {
        console.error('Usage: validation-tracker.mjs block <gate_id> <description>');
        process.exit(1);
      }

      await addBlocker(blockGateId, blockDescription);
      break;

    case 'unblock':
      const blockerIndex = parseInt(process.argv[3]);

      if (isNaN(blockerIndex)) {
        console.error('Usage: validation-tracker.mjs unblock <blocker_index>');
        process.exit(1);
      }

      await removeBlocker(blockerIndex);
      break;

    case 'report':
      await generateReport();
      break;

    case 'help':
      console.log(`
Stage 7 Validation Tracker

Usage:
  validation-tracker.mjs status              Show validation dashboard
  validation-tracker.mjs update <gate> <field> <value>  Update gate status
  validation-tracker.mjs block <gate> <description>     Add blocker
  validation-tracker.mjs unblock <index>     Remove blocker
  validation-tracker.mjs report              Generate validation report

Gates:
  gate_1  Simulator Backtest Pack
  gate_2  Patch-Market Replay Study
  gate_3  Governance Bypass Game Day
  gate_4  Synthesis Safety Trial
  gate_5  30-Day Operational Soak

Examples:
  validation-tracker.mjs update gate_3 status in_progress
  validation-tracker.mjs update gate_3 progress 50
  validation-tracker.mjs block gate_1 "Waiting for historical data export"
  validation-tracker.mjs unblock 0
      `);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "validation-tracker.mjs help" for usage');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Validation tracker error:', error);
  process.exit(2);
});
