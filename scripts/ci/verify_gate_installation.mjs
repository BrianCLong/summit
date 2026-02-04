#!/usr/bin/env node

/**
 * Evidence ID Consistency Gate Validator
 * Verifies that the gate is properly configured and functioning
 */

import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

async function validateGateInstallation() {
  console.log('🔍 Validating Evidence ID Consistency Gate Installation...\n');

  // Check 1: Script file exists
  let scriptExists = false;
  try {
    await fs.access('scripts/ci/verify_evidence_id_consistency.mjs');
    scriptExists = true;
    console.log('✅ Gate script: verify_evidence_id_consistency.mjs - FOUND');
  } catch (error) {
    console.log('❌ Gate script: verify_evidence_id_consistency.mjs - MISSING');
  }

  // Check 2: Package.json script exists
  let packageJsonExists = false;
  try {
    const pkgContent = await fs.readFile('package.json', 'utf8');
    const pkg = JSON.parse(pkgContent);
    if (pkg.scripts && pkg.scripts['ci:evidence-id-consistency']) {
      packageJsonExists = true;
      console.log('✅ Package.json entry: ci:evidence-id-consistency - FOUND');
    } else {
      console.log('❌ Package.json entry: ci:evidence-id-consistency - MISSING');
    }
  } catch (error) {
    console.log('❌ Unable to read package.json or find script entry');
  }

  // Check 3: Evidence map exists
  let evidenceMapExists = false;
  try {
    await fs.access('evidence/map.yml');
    evidenceMapExists = true;
    console.log('✅ Evidence registry: evidence/map.yml - FOUND');
  } catch (error) {
    console.log('⚠️  Evidence registry: evidence/map.yml - NOT FOUND (may be created later)');
  }

  // Check 4: Policy file exists
  let policyFileExists = false;
  try {
    await fs.access('docs/governance/EVIDENCE_ID_POLICY.yml');
    policyFileExists = true;
    console.log('✅ Policy file: docs/governance/EVIDENCE_ID_POLICY.yml - FOUND');
  } catch (error) {
    console.log('❌ Policy file: docs/governance/EVIDENCE_ID_POLICY.yml - MISSING');
  }

  // Check 5: Governance documents exist
  let govDocsExist = false;
  try {
    const govDirStats = await fs.stat('docs/governance');
    if (govDirStats.isDirectory()) {
      const govFiles = await fs.readdir('docs/governance');
      const mdFiles = govFiles.filter(f => f.endsWith('.md')).length;
      if (mdFiles > 0) {
        govDocsExist = true;
        console.log(`✅ Governance docs: ${mdFiles} .md files found in docs/governance/`);
      } else {
        console.log('⚠️  Governance docs: No .md files found in docs/governance/');
      }
    }
  } catch (error) {
    console.log('⚠️  Governance docs directory: docs/governance/ - NOT FOUND (may be created later)');
  }

  // Check 6: Test files exist
  let testFilesExist = false;
  try {
    await fs.access('scripts/ci/__tests__/verify_evidence_id_consistency.test.mjs');
    testFilesExist = true;
    console.log('✅ Test files: verify_evidence_id_consistency.test.mjs - FOUND');
  } catch (error) {
    console.log('❌ Test files: verify_evidence_id_consistency.test.mjs - MISSING');
  }

  // Check 7: Run a quick functional test
  console.log('\n🧪 Running quick functional test...');
  try {
    const result = await runGateTest();
    console.log('✅ Functional test: PASSED');
  } catch (error) {
    console.log(`❌ Functional test: FAILED - ${error.message}`);
  }

  // Summary
  console.log('\n📋 Installation Summary:');
  console.log(`- Gate script: ${scriptExists ? '✅' : '❌'}`);
  console.log(`- Package entry: ${packageJsonExists ? '✅' : '❌'}`);
  console.log(`- Evidence map: ${evidenceMapExists ? '✅' : '⚠️'}`);
  console.log(`- Policy file: ${policyFileExists ? '✅' : '❌'}`);
  console.log(`- Governance docs: ${govDocsExist ? '✅' : '⚠️'}`);
  console.log(`- Test files: ${testFilesExist ? '✅' : '❌'}`);

  const allCriticalPresent = scriptExists && packageJsonExists && policyFileExists;
  const isRunnable = allCriticalPresent && (govDocsExist || evidenceMapExists);

  console.log(`\n🎯 Gate status: ${isRunnable ? 'RUNNABLE' : 'NEEDS_ATTENTION'}`);
  console.log(`✨ Critical components: ${allCriticalPresent ? 'ALL_PRESENT' : 'MISSING_REQUIRED'}`);

  if (isRunnable) {
    console.log('\n🚀 To run the gate:');
    console.log('   npm run ci:evidence-id-consistency -- --sha=your-commit-sha');
    console.log('\n💡 To enable AI analysis:');
    console.log('   ENABLE_QWEN_ANALYSIS=true npm run ci:evidence-id-consistency');
    console.log('\n📋 To enable patch generation:');
    console.log('   ENABLE_QWEN_PATCHES=true npm run ci:evidence-id-consistency');
  }
  
  return isRunnable;
}

function runGateTest() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['scripts/ci/verify_evidence_id_consistency.mjs', '--sha=test-validation', '--help'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      // The script should run successfully even if --help causes non-zero exit code
      // As long as it doesn't crash with syntax errors
      if (code !== 0 && !output.includes('Evidence ID Consistency')) {
        reject(new Error(`Script crashed with code ${code}, output: ${output.substring(0, 200)}...`));
      } else {
        resolve(true);
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Run validation when called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  validateGateInstallation()
    .then(isValid => {
      process.exit(isValid ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation error:', error.message);
      process.exit(1);
    });
}

export { validateGateInstallation };