#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const DIST_RELEASE = resolve('dist/release');
const OUTPUT_FILE = join(DIST_RELEASE, 'release-report.md');

function readJson(filename) {
  const path = join(DIST_RELEASE, filename);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (e) {
      console.warn(`⚠️  Failed to parse ${filename}: ${e.message}`);
      return null;
    }
  }
  return null;
}

function getStatusIcon(isOk) {
  return isOk ? '✅' : '❌';
}

function main() {
  console.log('📝 Building Release Report...');

  // 1. Read Artifacts
  const status = readJson('release-status.json');
  const manifest = readJson('release-manifest.json');
  const provenance = readJson('provenance.json');
  const preflight = readJson('preflight.json');
  const freeze = readJson('freeze.json');
  const verify = readJson('verify.json');
  const evidence = readJson('evidence-check.json');
  const channel = readJson('channel.json');

  // 2. Build Header
  const tag = manifest?.tag || status?.tag || 'UNKNOWN_TAG';
  const releaseChannel = channel?.channel || 'default';
  const generatedAt = manifest?.generated_at || new Date().toISOString();
  const overallStatus = status?.status || 'UNKNOWN';

  let report = `# Release Audit Report\n\n`;
  report += `**Tag:** \`${tag}\`\n`;
  report += `**Channel:** \`${releaseChannel}\`\n`;
  report += `**Generated:** ${generatedAt}\n`;
  report += `**Status:** ${overallStatus}\n\n`;

  // 3. Gate Summary
  report += `## Gate Summary\n\n`;
  report += `| Gate | OK | Evidence |\n`;
  report += `|---|---|---|\n`;

  // Logic for determining "OK" - naive check based on file existence or specific property if known

  const isPreflightOk = preflight?.status === 'success' || preflight?.passed === true || (preflight && !preflight.error);
  report += `| Preflight | ${getStatusIcon(isPreflightOk)} | \`dist/release/preflight.json\` |\n`;

  const isFreezeOk = freeze?.status === 'success' || freeze?.passed === true || (freeze && !freeze.blocked);
  report += `| Freeze | ${getStatusIcon(isFreezeOk)} | \`dist/release/freeze.json\` |\n`;

  const isVerifyOk = verify?.status === 'success' || verify?.passed === true || (verify && !verify.failed);
  report += `| Verify | ${getStatusIcon(isVerifyOk)} | \`dist/release/verify.json\` |\n`;

  if (evidence) {
      const isEvidenceOk = evidence?.status === 'success' || evidence?.passed === true;
      report += `| Evidence | ${getStatusIcon(isEvidenceOk)} | \`dist/release/evidence-check.json\` |\n`;
  }
  report += `\n`;

  // 4. Artifacts
  report += `## Artifacts\n\n`;

  const keyFiles = [
    'SHA256SUMS',
    'bundle-index.json',
    'sbom.cdx.json',
    'provenance.json',
    'release-notes.md'
  ];

  // Also check what's actually there
  const existingFiles = existsSync(DIST_RELEASE) ? readdirSync(DIST_RELEASE) : [];

  for (const file of keyFiles) {
    if (existingFiles.includes(file)) {
      // Link text is full path, link target is relative file
      report += `- [dist/release/${file}](./${file})\n`;
    } else {
      report += `- ~dist/release/${file}~ (missing)\n`;
    }
  }
  report += `\n`;

  // 5. Run Context
  report += `## Run Context\n\n`;
  const runUrl = provenance?.build?.url || manifest?.run_url || 'N/A';
  const sha = manifest?.sha || provenance?.revision || 'N/A';

  report += `*   **Run URL:** ${runUrl}\n`;
  report += `*   **Commit SHA:** \`${sha}\`\n\n`;

  // 6. Policy
  report += `## Policy\n\n`;
  report += `*   **Policy File:** \`release-policy.yml\`\n`;

  // Infer freeze override
  if (freeze?.overridden || manifest?.freeze_overridden) {
      report += `*   **Freeze:** OVERRIDDEN\n`;
  } else {
      report += `*   **Freeze:** Enabled\n`; // Default assumption
  }

  // Write output
  if (!existsSync(DIST_RELEASE)) {
      console.error(`❌ dist/release directory does not exist.`);
      process.exit(1);
  }

  writeFileSync(OUTPUT_FILE, report);
  console.log(`✅ Generated release report at ${OUTPUT_FILE}`);
}

main();
