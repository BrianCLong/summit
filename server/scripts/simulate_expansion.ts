#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';

// --- Diagnostics ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Simulation Diagnostics ---');
console.log(`CWD: ${process.cwd()}`);
console.log(`ExecPath: ${process.execPath}`);
console.log(`__filename: ${__filename}`);
console.log(`__dirname: ${__dirname}`);
console.log(`Node Version: ${process.version}`);
console.log('------------------------------');

// Simple polyfill for color output
const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
};

async function main() {
  const targetCountry = process.argv[2]?.toUpperCase();

  if (!targetCountry) {
    console.error('Usage: simulate_expansion.ts <COUNTRY_CODE>');
    process.exit(1);
  }

  // --- Dynamic Imports with Explicit Resolution ---
  let regionalConfigService;
  let dataLifecycleService;
  let supportRouter;

  try {
    const regionalConfigPath = new URL('../src/services/RegionalConfigService.ts', import.meta.url).href;
    console.log(`Importing RegionalConfigService from: ${regionalConfigPath}`);
    const regionalModule = await import(regionalConfigPath);
    regionalConfigService = regionalModule.regionalConfigService;

    const lifecyclePath = new URL('../src/services/DataLifecycleService.ts', import.meta.url).href;
    console.log(`Importing DataLifecycleService from: ${lifecyclePath}`);
    const lifecycleModule = await import(lifecyclePath);
    dataLifecycleService = lifecycleModule.dataLifecycleService;

    const supportPath = new URL('../src/services/SupportRouter.ts', import.meta.url).href;
    console.log(`Importing SupportRouter from: ${supportPath}`);
    const supportModule = await import(supportPath);
    supportRouter = supportModule.supportRouter;

  } catch (err: any) {
    console.error(colors.red(`\nCRITICAL: Failed to load required services.`));
    console.error(`Error: ${err.message}`);
    console.error(`Stack: ${err.stack}`);
    // If it's a module not found error, print more details
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
        console.error(`Module resolution failure. Check paths relative to ${import.meta.url}`);
    }
    process.exit(1);
  }

  console.log(colors.bold(`\n🌍 Simulating Expansion Readiness for: ${targetCountry}\n`));

  const report: Record<string, any> = {
    country: targetCountry,
    checks: [],
    decision: 'PENDING',
  };

  try {
    // 1. Config Check
    console.log('🔍 Checking Regional Configuration...');
    try {
      const config = regionalConfigService.getConfig(targetCountry);
      report.checks.push({ name: 'Configuration Exists', status: 'PASS', details: `Region: ${config.region}` });
      console.log(colors.green('  ✓ Configuration found'));

      // 2. Residency Check
      console.log('🔍 Verifying Data Residency...');
      if (config.residency.strictSovereignty) {
        console.log(colors.yellow(`  ! Strict sovereignty enforced (${config.residency.dataRegion})`));
      } else {
        console.log(colors.green(`  ✓ Data transfer allowed to: ${config.residency.allowedTransferTargets.join(', ')}`));
      }
      report.checks.push({ name: 'Residency Policy', status: 'PASS', details: config.residency.strictSovereignty ? 'Strict' : 'Flexible' });

      // 3. Privacy Check
      console.log('🔍 Validating Privacy Controls...');
      const requiresConsent = config.privacy.requiresConsent;
      const retention = config.privacy.retentionYears;
      console.log(`  - Consent Required: ${requiresConsent ? 'Yes' : 'No'}`);
      console.log(`  - Retention Limit: ${retention} years`);

      // Simulate lifecycle check
      const testDate = new Date();
      testDate.setFullYear(testDate.getFullYear() - (retention + 1));
      const compliant = dataLifecycleService.isRetentionCompliant(targetCountry, testDate);
      if (!compliant) {
         console.log(colors.green('  ✓ Retention enforcement verified (old data rejected)'));
         report.checks.push({ name: 'Retention Enforcement', status: 'PASS' });
      } else {
         console.log(colors.red('  ✗ Retention enforcement failed'));
         report.checks.push({ name: 'Retention Enforcement', status: 'FAIL' });
      }

      // 4. Operational Check
      console.log('🔍 Checking Operational Readiness...');
      const support = supportRouter.getSupportInfo(targetCountry);
      console.log(`  - Support Hours: ${support.hours}`);
      console.log(`  - Escalation: ${support.email}`);

      if (!support.email) {
         console.log(colors.red('  ✗ Missing escalation contact'));
         report.checks.push({ name: 'Operational Readiness', status: 'FAIL' });
      } else {
         report.checks.push({ name: 'Operational Readiness', status: 'PASS' });
      }

    } catch (e: any) {
      console.log(colors.red(`  ✗ ${e.message}`));
      report.checks.push({ name: 'Configuration Exists', status: 'FAIL', error: e.message });
      report.decision = 'NO-GO';
      console.log(colors.bold(`\n🚫 DECISION: NO-GO (Configuration Missing or Invalid)\n`));
      process.exit(1);
    }

    // Final Decision
    const failed = report.checks.some((c: any) => c.status === 'FAIL');
    if (failed) {
      report.decision = 'NO-GO';
      console.log(colors.bold(`\n🚫 DECISION: NO-GO (Checks Failed)\n`));
      process.exit(1);
    } else {
      report.decision = 'GO';
      console.log(colors.bold(`\n✅ DECISION: GO (Ready for Expansion)\n`));
    }

  } catch (error: any) {
    console.error('Simulation failed:', error);
    process.exit(1);
  }
}

main();
