#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { program } from 'commander';

// Helper to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function main() {
  program
    .option('--report <path>', 'Path to inventory report.json', 'artifacts/artifact-budget/report.json')
    .option('--policy <path>', 'Path to policy file', 'release-policy.yml')
    .option('--profile <name>', 'Budget profile to enforce (normal|release_intent)', 'normal')
    .parse(process.argv);

  const options = program.opts();
  const reportPath = options.report;
  const policyPath = options.policy;
  const profileName = options.profile;

  console.log(`Enforcing artifact budgets using profile: ${profileName}...`);

  // Load policy
  let policy;
  try {
    const policyContent = await fs.readFile(policyPath, 'utf8');
    policy = yaml.load(policyContent);
  } catch (error) {
    console.error(`Failed to load policy from ${policyPath}:`, error);
    process.exit(1);
  }

  const budgets = policy.artifact_budgets?.[profileName];
  if (!budgets) {
    console.error(`Profile '${profileName}' not found in policy.`);
    process.exit(1);
  }

  // Load report
  let report;
  try {
    const reportContent = await fs.readFile(reportPath, 'utf8');
    report = JSON.parse(reportContent);
  } catch (error) {
    console.error(`Failed to load report from ${reportPath}:`, error);
    // If report is missing, maybe no artifacts were generated or inventory failed.
    // In strict mode this might be an error, but here we'll assume nothing to check.
    process.exit(1);
  }

  const errors = [];
  const warnings = [];

  // 1. Check Total Size
  const totalMb = report.totalBytes / (1024 * 1024);
  if (totalMb > budgets.max_total_mb) {
    errors.push(`Total artifact size (${formatBytes(report.totalBytes)}) exceeds budget of ${budgets.max_total_mb} MB.`);
  }

  // 2. Check Total Files
  if (report.totalFiles > budgets.max_files) {
    errors.push(`Total file count (${report.totalFiles}) exceeds limit of ${budgets.max_files}.`);
  }

  // 3. Check Per-Section Budgets
  if (budgets.per_section_mb) {
    for (const [sectionName, limitMb] of Object.entries(budgets.per_section_mb)) {
      const sectionStats = report.sections[sectionName];
      if (sectionStats) {
        const sectionMb = sectionStats.bytes / (1024 * 1024);
        if (sectionMb > limitMb) {
          errors.push(`Section '${sectionName}' size (${formatBytes(sectionStats.bytes)}) exceeds budget of ${limitMb} MB.`);
        }
      }
    }
  }

  // Report results
  if (errors.length > 0) {
    console.error('\n❌ Artifact Budget Exceeded:');
    errors.forEach(e => console.error(` - ${e}`));

    console.log('\nTop Contributors:');
    report.topFiles.slice(0, 5).forEach(f => {
       console.log(` - ${f.path} (${f.formattedSize})`);
    });

    console.log('\nSuggested Actions:');
    console.log(' - Review exclusions in release-policy.yml');
    console.log(' - Enable stricter trimming for large artifacts (logs, traces)');

    if (profileName === 'release_intent') {
        console.error('\nFailure: Budget enforcement is strict for release-intent.');
        process.exit(1);
    } else {
        console.warn('\nWarning: Budget exceeded. These checks will be mandatory for release-intent.');
        // For normal profiles, we might just warn, or exit 0.
        // Task says: "if normal PR: warn-only"
        process.exit(0);
    }
  } else {
    console.log('\n✅ All artifact budgets passed.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
