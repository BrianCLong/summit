#!/usr/bin/env node

/**
 * Summit Governance System - Health Check
 * Validates that all components of the governance system are properly installed
 */

import fs from 'fs';
import path from 'path';

const REQUIRED_DIRS = [
  'scripts/config',
  'scripts/governance/project19/lib',
  'scripts/governance/project19/bin',
  'docs/governance',
  'docs/governance/project19',
  '.github/workflows'
];

const REQUIRED_FILES = [
  // Config files
  'scripts/config/project19-field-schema.json',
  'scripts/config/project19-label-map.json', 
  'scripts/config/project19-workflow-map.json',
  'scripts/config/project19-score-policy.json',
  'scripts/config/project19-views.json',
  
  // Library files
  'scripts/governance/project19/lib/github-graphql.mjs',
  'scripts/governance/project19/lib/determinism.mjs',
  'scripts/governance/project19/lib/schema.mjs',
  'scripts/governance/project19/lib/field-ops.mjs',
  'scripts/governance/project19/lib/item-ops.mjs',
  'scripts/governance/project19/lib/mapping.mjs',
  'scripts/governance/project19/lib/scoring.mjs',
  'scripts/governance/project19/lib/artifacts.mjs',
  
  // Binary scripts
  'scripts/governance/project19/bin/ensure-fields.mjs',
  'scripts/governance/project19/bin/apply-event.mjs',
  'scripts/governance/project19/bin/apply-workflow-run.mjs',
  'scripts/governance/project19/bin/reconcile-nightly.mjs',
  'scripts/governance/project19/bin/generate-board-snapshot.mjs',
  
  // Workflow files
  '.github/workflows/project19-fields-ensure.yml',
  '.github/workflows/project19-event-sync.yml',
  '.github/workflows/project19-ci-signals.yml',
  '.github/workflows/project19-nightly-reconcile.yml',
  '.github/workflows/project19-generate-snapshot.yml',
  
  // Documentation
  'scripts/governance/project19/README.md',
  'docs/governance/PROJECT19_DASHBOARDS.md',
  'docs/governance/OPERATING_PROCEDURES.md',
  'docs/governance/SYSTEM_IMPLEMENTATION_COMPLETE.md'
];

const PACKAGE_SCRIPTS_TO_CHECK = [
  'enforce:project19',
  'integrate:ci-fields', 
  'process:event',
  'ga-simulate',
  'generate:snapshot'
];

function checkDirectories() {
  console.log('🔍 Checking required directories...\n');
  
  let allDirsExist = true;
  for (const dir of REQUIRED_DIRS) {
    const exists = fs.existsSync(dir);
    console.log(`${exists ? '✅' : '❌'} ${dir}`);
    if (!exists) allDirsExist = false;
  }
  
  console.log('');
  return allDirsExist;
}

function checkFiles() {
  console.log('🔍 Checking required files...\n');
  
  let allFilesExist = true;
  for (const file of REQUIRED_FILES) {
    const exists = fs.existsSync(file);
    console.log(`${exists ? '✅' : '❌'} ${file}`);
    if (!exists) allFilesExist = false;
  }
  
  console.log('');
  return allFilesExist;
}

function checkPackageScripts() {
  console.log('🔍 Checking package.json scripts...\n');
  
  if (!fs.existsSync('package.json')) {
    console.log('❌ package.json not found');
    return false;
  }
  
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    let allScriptsPresent = true;
    
    for (const script of PACKAGE_SCRIPTS_TO_CHECK) {
      const exists = !!pkg.scripts[script];
      console.log(`${exists ? '✅' : '❌'} ${script}`);
      if (!exists) allScriptsPresent = false;
    }
    
    console.log('');
    return allScriptsPresent;
  } catch (error) {
    console.log('❌ Error reading package.json:', error.message);
    return false;
  }
}

function validateConfigFiles() {
  console.log('🔍 Validating configuration files...\n');
  
  let allValid = true;
  const configFiles = [
    'scripts/config/project19-field-schema.json',
    'scripts/config/project19-label-map.json',
    'scripts/config/project19-workflow-map.json', 
    'scripts/config/project19-score-policy.json'
  ];
  
  for (const configFile of configFiles) {
    if (fs.existsSync(configFile)) {
      try {
        const content = fs.readFileSync(configFile, 'utf8');
        JSON.parse(content);
        console.log(`✅ ${configFile} (valid JSON)`);
      } catch (error) {
        console.log(`❌ ${configFile} (invalid JSON: ${error.message})`);
        allValid = false;
      }
    } else {
      console.log(`❌ ${configFile} (file not found)`);
      allValid = false;
    }
  }
  
  console.log('');
  return allValid;
}

function runHealthCheck() {
  console.log('🏥 Summit Governance System - Health Check\n');
  console.log('=============================================\n');
  
  const dirsOk = checkDirectories();
  const filesOk = checkFiles();
  const scriptsOk = checkPackageScripts();
  const configsOk = validateConfigFiles();
  
  console.log('📊 Health Check Summary\n');
  console.log(`Directories: ${dirsOk ? '✅ ALL PRESENT' : '❌ MISSING DIRECTORIES'}`);
  console.log(`Files: ${filesOk ? '✅ ALL PRESENT' : '❌ MISSING FILES'}`);
  console.log(`Scripts: ${scriptsOk ? '✅ ALL PRESENT' : '❌ MISSING SCRIPTS'}`);
  console.log(`Configs: ${configsOk ? '✅ ALL VALID' : '❌ INVALID CONFIGS'}`);
  
  const systemHealthy = dirsOk && filesOk && scriptsOk && configsOk;
  
  console.log(`\n🎯 Overall Status: ${systemHealthy ? '✅ SYSTEM HEALTHY' : '❌ SYSTEM NEEDS ATTENTION'}`);
  
  if (systemHealthy) {
    console.log('\n🎉 Summit Governance System is fully installed and operational!');
    console.log('   All components are in place and ready for production use.');
  } else {
    console.log('\n⚠️  System requires attention to become fully operational.');
    console.log('   Please review the failed checks above.');
  }
  
  return systemHealthy;
}

// Run the health check
const isHealthy = runHealthCheck();
process.exit(isHealthy ? 0 : 1);