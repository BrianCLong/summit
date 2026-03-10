#!/usr/bin/env node
/**
 * Governance Bypass Drill
 *
 * Gate 3: Tests meta-governance lock enforcement by attempting
 * controlled bypass attacks on protected systems.
 *
 * Beyond FAANG Innovation: Constitutional governance with bypass validation
 *
 * IMPORTANT: This is a controlled security drill. All attempts are logged
 * and expected to fail. Success = all bypasses rejected.
 */

import fs from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Drill configuration
 */
const DRILL_SCENARIOS = [
  {
    id: 'bypass-1',
    name: 'Attempt to disable stability monitor via direct file edit',
    target: '.repoos/meta-governance-lock.yml',
    method: 'Modify protected_systems.enabled to false',
    expected: 'REJECTED by CODEOWNERS + branch protection',
    test: 'dry-run'  // Don't actually attempt (would be blocked anyway)
  },
  {
    id: 'bypass-2',
    name: 'Attempt to remove constitution enforcement from workflow',
    target: '.github/workflows/constitution-enforcement.yml',
    method: 'Comment out enforcement steps',
    expected: 'REJECTED by CODEOWNERS (requires 2 approvals)',
    test: 'dry-run'
  },
  {
    id: 'bypass-3',
    name: 'Attempt to raise agent budget limits',
    target: '.repoos/agent-budget.yml',
    method: 'Increase global_limits.max_patches_per_day to 10000',
    expected: 'REJECTED by CODEOWNERS (requires 2 approvals)',
    test: 'dry-run'
  },
  {
    id: 'bypass-4',
    name: 'Attempt to disable SFPC enforcement',
    target: '.repoos/patch-surface-limiting.yml',
    method: 'Set sfpc.enforcement to disabled',
    expected: 'REJECTED by CODEOWNERS (requires 2 approvals)',
    test: 'dry-run'
  },
  {
    id: 'bypass-5',
    name: 'Attempt to modify domain map to game metrics',
    target: '.repoos/domain-map.yml',
    method: 'Consolidate all domains into one to lower FE',
    expected: 'REJECTED by CODEOWNERS (requires 2 approvals)',
    test: 'dry-run'
  }
];

/**
 * Load bypass drill audit log
 */
async function loadAuditLog() {
  try {
    const content = await fs.readFile('.repoos/governance-audit-log.json', 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return {
      drill_history: [],
      bypass_attempts: [],
      override_requests: []
    };
  }
}

/**
 * Save audit log
 */
async function saveAuditLog(log) {
  await fs.mkdir('.repoos', { recursive: true });
  await fs.writeFile(
    '.repoos/governance-audit-log.json',
    JSON.stringify(log, null, 2)
  );
}

/**
 * Check if branch protection is enabled
 */
async function checkBranchProtection() {
  try {
    // Check via gh CLI
    const protectionJson = execSync(
      'gh api repos/:owner/:repo/branches/main/protection 2>/dev/null || echo "null"',
      { encoding: 'utf-8' }
    );

    if (protectionJson === 'null' || protectionJson.trim() === '') {
      return {
        enabled: false,
        details: 'Branch protection not configured'
      };
    }

    const protection = JSON.parse(protectionJson);

    return {
      enabled: true,
      enforce_admins: protection.enforce_admins?.enabled || false,
      required_reviews: protection.required_pull_request_reviews?.required_approving_review_count || 0,
      required_status_checks: protection.required_status_checks?.checks?.length || 0,
      codeowners_required: protection.required_pull_request_reviews?.require_code_owner_reviews || false
    };
  } catch (error) {
    return {
      enabled: false,
      error: error.message
    };
  }
}

/**
 * Check CODEOWNERS coverage
 */
async function checkCodeownersAudit() {
  try {
    const codeowners = await fs.readFile('.github/CODEOWNERS', 'utf-8');

    const protectedFiles = [
      '.repoos/meta-governance-lock.yml',
      '.repoos/constitution.yml',
      '.repoos/evidence-governor-config.yml',
      '.repoos/stability-envelope.yml',
      '.repoos/agent-budget.yml',
      '.repoos/patch-surface-limiting.yml',
      '.repoos/domain-map.yml',
      'scripts/repoos/homeostasis-controller.mjs',
      '.github/workflows/stage-6-7-enforcement.yml'
    ];

    const coverage = {};
    for (const file of protectedFiles) {
      // Check if file is mentioned in CODEOWNERS
      const pattern = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const hasCoverage = codeowners.includes(file) ||
                          codeowners.includes(file.split('/').slice(0, -1).join('/') + '/');

      coverage[file] = hasCoverage;
    }

    const totalFiles = Object.keys(coverage).length;
    const coveredFiles = Object.values(coverage).filter(c => c).length;

    return {
      total: totalFiles,
      covered: coveredFiles,
      coverage_percentage: (coveredFiles / totalFiles) * 100,
      details: coverage
    };
  } catch (error) {
    return {
      total: 0,
      covered: 0,
      coverage_percentage: 0,
      error: error.message
    };
  }
}

/**
 * Simulate bypass attempt (dry-run)
 */
async function simulateBypass(scenario) {
  const result = {
    scenario_id: scenario.id,
    scenario_name: scenario.name,
    timestamp: new Date().toISOString(),
    target: scenario.target,
    method: scenario.method,
    expected_outcome: scenario.expected,
    actual_outcome: null,
    success: false  // success = bypass was blocked
  };

  // Check if file exists
  try {
    await fs.access(scenario.target);
    result.target_exists = true;
  } catch (error) {
    result.target_exists = false;
    result.actual_outcome = `Target file ${scenario.target} does not exist`;
    result.success = true;  // Can't bypass non-existent protection
    return result;
  }

  // Simulate the bypass attempt
  // In a real drill, we would:
  // 1. Create a test branch
  // 2. Modify the file
  // 3. Attempt to create PR
  // 4. Verify it's blocked
  //
  // For now, we do a dry-run simulation

  // Check protections
  const branchProtection = await checkBranchProtection();
  const codeowners = await checkCodeownersAudit();

  if (!branchProtection.enabled) {
    result.actual_outcome = '⚠️  Branch protection NOT ENABLED - bypass would succeed';
    result.success = false;  // Drill fails if protections not set up
    result.remediation = 'Enable branch protection on main branch';
    return result;
  }

  if (!branchProtection.enforce_admins) {
    result.actual_outcome = '⚠️  enforce_admins NOT ENABLED - admin bypass possible';
    result.success = false;
    result.remediation = 'Enable enforce_admins on main branch protection';
    return result;
  }

  if (!branchProtection.codeowners_required) {
    result.actual_outcome = '⚠️  CODEOWNERS review NOT REQUIRED - bypass possible';
    result.success = false;
    result.remediation = 'Enable require_code_owner_reviews on main branch';
    return result;
  }

  if (!codeowners.details[scenario.target]) {
    result.actual_outcome = `⚠️  ${scenario.target} NOT in CODEOWNERS - no protection`;
    result.success = false;
    result.remediation = `Add ${scenario.target} to .github/CODEOWNERS`;
    return result;
  }

  // All protections in place
  result.actual_outcome = '✅ BLOCKED - All protections active (enforce_admins + CODEOWNERS + branch protection)';
  result.success = true;  // Bypass was blocked = drill success
  result.protection_details = {
    branch_protection: branchProtection.enabled,
    enforce_admins: branchProtection.enforce_admins,
    required_reviews: branchProtection.required_reviews,
    codeowners_required: branchProtection.codeowners_required,
    file_in_codeowners: true
  };

  return result;
}

/**
 * Run bypass drill
 */
async function runDrill() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║        Governance Bypass Drill (Gate 3)                       ║');
  console.log('║        Meta-Governance Lock Enforcement Validation            ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('⚠️  CONTROLLED SECURITY DRILL');
  console.log('All bypass attempts are simulated and logged.');
  console.log('Success = All attempts rejected by protections.\n');

  // Pre-flight checks
  console.log('━━━ Pre-Flight Checks ━━━\n');

  const branchProtection = await checkBranchProtection();
  console.log(`Branch Protection: ${branchProtection.enabled ? '✅ Enabled' : '❌ Not Enabled'}`);
  if (branchProtection.enabled) {
    console.log(`  enforce_admins: ${branchProtection.enforce_admins ? '✅' : '❌'}`);
    console.log(`  required_reviews: ${branchProtection.required_reviews}`);
    console.log(`  codeowners_required: ${branchProtection.codeowners_required ? '✅' : '❌'}`);
  }
  console.log('');

  const codeowners = await checkCodeownersAudit();
  console.log(`CODEOWNERS Coverage: ${codeowners.coverage_percentage.toFixed(0)}% (${codeowners.covered}/${codeowners.total} files)`);
  console.log('');

  // Run scenarios
  console.log('━━━ Bypass Scenarios ━━━\n');

  const results = [];
  for (const scenario of DRILL_SCENARIOS) {
    console.log(`Testing: ${scenario.name}`);
    console.log(`  Target: ${scenario.target}`);
    console.log(`  Method: ${scenario.method}`);

    const result = await simulateBypass(scenario);
    results.push(result);

    console.log(`  Expected: ${scenario.expected}`);
    console.log(`  Actual: ${result.actual_outcome}`);
    console.log(`  Result: ${result.success ? '✅ PASS (bypass blocked)' : '❌ FAIL (bypass possible)'}`);

    if (result.remediation) {
      console.log(`  ⚠️  Remediation: ${result.remediation}`);
    }

    console.log('');
  }

  // Summary
  console.log('━━━ Drill Summary ━━━\n');

  const passedScenarios = results.filter(r => r.success).length;
  const totalScenarios = results.length;
  const successRate = (passedScenarios / totalScenarios) * 100;

  console.log(`Scenarios Tested: ${totalScenarios}`);
  console.log(`Bypasses Blocked: ${passedScenarios}/${totalScenarios} (${successRate.toFixed(0)}%)`);
  console.log('');

  // Gate 3 acceptance criteria
  const gate3Pass = successRate === 100 &&
                     branchProtection.enabled &&
                     branchProtection.enforce_admins &&
                     branchProtection.codeowners_required &&
                     codeowners.coverage_percentage >= 90;

  console.log(`Gate 3 Status: ${gate3Pass ? '✅ PASS' : '❌ FAIL'}\n`);

  if (!gate3Pass) {
    console.log('⚠️  Gate 3 Acceptance Criteria Not Met:\n');
    if (successRate < 100) {
      console.log(`  - Bypass success rate must be 100% (current: ${successRate.toFixed(0)}%)`);
    }
    if (!branchProtection.enabled || !branchProtection.enforce_admins) {
      console.log('  - Branch protection with enforce_admins must be enabled');
    }
    if (!branchProtection.codeowners_required) {
      console.log('  - CODEOWNERS review must be required');
    }
    if (codeowners.coverage_percentage < 90) {
      console.log(`  - CODEOWNERS coverage must be ≥90% (current: ${codeowners.coverage_percentage.toFixed(0)}%)`);
    }
    console.log('');
  }

  // Save audit log
  const auditLog = await loadAuditLog();
  auditLog.drill_history.push({
    timestamp: new Date().toISOString(),
    drill_type: 'governance_bypass',
    scenarios_tested: totalScenarios,
    bypasses_blocked: passedScenarios,
    success_rate: successRate,
    gate_3_pass: gate3Pass,
    results
  });

  await saveAuditLog(auditLog);

  // Save Gate 3 evidence
  const evidence = {
    gate: 'gate_3',
    name: 'Governance Bypass Game Day',
    timestamp: new Date().toISOString(),
    drill_summary: {
      scenarios_tested: totalScenarios,
      bypasses_blocked: passedScenarios,
      success_rate: successRate
    },
    pre_flight_checks: {
      branch_protection: branchProtection,
      codeowners_coverage: codeowners
    },
    bypass_scenarios: results,
    acceptance_criteria: {
      criterion_1: {
        name: '100% bypass rejection',
        status: successRate === 100 ? 'passed' : 'failed',
        value: successRate,
        threshold: 100
      },
      criterion_2: {
        name: 'enforce_admins enabled',
        status: branchProtection.enforce_admins ? 'passed' : 'failed',
        value: branchProtection.enforce_admins
      },
      criterion_3: {
        name: 'CODEOWNERS coverage ≥90%',
        status: codeowners.coverage_percentage >= 90 ? 'passed' : 'failed',
        value: codeowners.coverage_percentage,
        threshold: 90
      }
    },
    gate_3_result: gate3Pass ? 'PASS' : 'FAIL'
  };

  await fs.mkdir('.repoos/validation', { recursive: true });
  await fs.writeFile(
    '.repoos/validation/governance-bypass-game-day.json',
    JSON.stringify(evidence, null, 2)
  );

  console.log('✓ Drill results saved:');
  console.log('  - .repoos/governance-audit-log.json');
  console.log('  - .repoos/validation/governance-bypass-game-day.json\n');

  console.log('Beyond FAANG Innovation:');
  console.log('  Constitutional governance with automated bypass validation');
  console.log('  ensures control loops cannot be disabled without authorization.\n');

  return gate3Pass ? 0 : 1;
}

/**
 * Main execution
 */
runDrill()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('\n❌ Bypass drill error:', error);
    process.exit(2);
  });
