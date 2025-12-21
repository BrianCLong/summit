#!/usr/bin/env node
import process from 'node:process';
import { appendAuditLog } from './auditLog.js';
import { findPlanPath, loadPlan } from './config.js';
import { validatePlan } from './validators.js';

function parseArgs(argv: string[]): { planPath?: string; audit?: boolean } {
  const args = argv.slice(2);
  const options: { planPath?: string; audit?: boolean } = { audit: true };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--plan' || arg === '-p') {
      options.planPath = args[i + 1];
      i += 1;
    }
    if (arg === '--no-audit') {
      options.audit = false;
    }
  }
  return options;
}

function main(): void {
  const { planPath: providedPlanPath, audit } = parseArgs(process.argv);
  const planPath = findPlanPath(providedPlanPath);
  const plan = loadPlan(planPath);
  const report = validatePlan(plan);
  console.log(JSON.stringify(report, null, 2));
  if (audit !== false) {
    appendAuditLog(planPath, report);
  }
  if (report.overallStatus === 'fail') {
    process.exit(1);
  }
}

main();
