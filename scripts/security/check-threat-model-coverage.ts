#!/usr/bin/env ts-node
/**
 * Threat Model Coverage Checker
 *
 * This script checks if changed files in a PR have associated threat models
 * and whether those threat models are up-to-date.
 *
 * Usage:
 *   npx ts-node scripts/security/check-threat-model-coverage.ts --changed-files "file1.ts,file2.ts"
 *   npx ts-node scripts/security/check-threat-model-coverage.ts --base-ref main
 *
 * Exit codes:
 *   0 - All checks passed or advisory only
 *   1 - Critical coverage missing (when --strict mode enabled)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ============================================================================
// Configuration
// ============================================================================

interface CoverageMapping {
  pattern: RegExp;
  feature: string;
  threatModel: string;
  riskTier: 'Critical' | 'High' | 'Medium' | 'Low';
  stalenessThresholdDays: number;
}

const COVERAGE_MAPPINGS: CoverageMapping[] = [
  {
    pattern: /^server\/src\/auth\//,
    feature: 'Authentication',
    threatModel: 'docs/security/threat-models/auth.md',
    riskTier: 'Critical',
    stalenessThresholdDays: 30,
  },
  {
    pattern: /^server\/src\/conductor\/auth\//,
    feature: 'JWT/RBAC',
    threatModel: 'docs/security/threat-models/auth.md',
    riskTier: 'Critical',
    stalenessThresholdDays: 30,
  },
  {
    pattern: /^services\/common\/auth\//,
    feature: 'WebAuthn/Step-up',
    threatModel: 'docs/security/threat-models/auth.md',
    riskTier: 'Critical',
    stalenessThresholdDays: 30,
  },
  {
    pattern: /^SECURITY\/policy\/opa\//,
    feature: 'Authorization Policies',
    threatModel: 'docs/security/threat-models/auth.md',
    riskTier: 'Critical',
    stalenessThresholdDays: 30,
  },
  {
    pattern: /^server\/src\/graphql\/intelgraph\//,
    feature: 'Graph Queries',
    threatModel: 'docs/security/threat-models/intelgraph-queries.md',
    riskTier: 'High',
    stalenessThresholdDays: 60,
  },
  {
    pattern: /^server\/src\/intelgraph\//,
    feature: 'Graph Client',
    threatModel: 'docs/security/threat-models/intelgraph-queries.md',
    riskTier: 'High',
    stalenessThresholdDays: 60,
  },
  {
    pattern: /^server\/src\/maestro\//,
    feature: 'AI Orchestration',
    threatModel: 'docs/security/threat-models/maestro-runs.md',
    riskTier: 'Critical',
    stalenessThresholdDays: 30,
  },
  {
    pattern: /^services\/copilot\//,
    feature: 'AI Copilot',
    threatModel: 'docs/security/threat-models/maestro-runs.md',
    riskTier: 'Critical',
    stalenessThresholdDays: 30,
  },
  {
    pattern: /^src\/maestro\//,
    feature: 'Maestro Versions',
    threatModel: 'docs/security/threat-models/maestro-runs.md',
    riskTier: 'Critical',
    stalenessThresholdDays: 30,
  },
  {
    pattern: /^conductor-ui\/frontend\/src\/maestro\//,
    feature: 'Maestro UI',
    threatModel: 'docs/security/threat-models/maestro-runs.md',
    riskTier: 'Critical',
    stalenessThresholdDays: 30,
  },
];

// ============================================================================
// Types
// ============================================================================

interface CheckResult {
  file: string;
  feature: string;
  threatModel: string;
  riskTier: string;
  status: 'present' | 'stale' | 'missing';
  lastUpdated?: string;
  daysSinceUpdate?: number;
  message: string;
}

interface SummaryResult {
  totalFiles: number;
  coveredFiles: number;
  results: CheckResult[];
  hasCriticalIssues: boolean;
  hasHighIssues: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseArgs(): { changedFiles: string[]; strict: boolean; outputFormat: string } {
  const args = process.argv.slice(2);
  let changedFiles: string[] = [];
  let strict = false;
  let outputFormat = 'text';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--changed-files' && args[i + 1]) {
      changedFiles = args[i + 1].split(',').map((f) => f.trim());
      i++;
    } else if (args[i] === '--base-ref' && args[i + 1]) {
      // Get changed files from git diff
      try {
        const baseRef = args[i + 1];
        const diff = execSync(`git diff --name-only ${baseRef}...HEAD`, {
          encoding: 'utf-8',
        });
        changedFiles = diff
          .split('\n')
          .filter((f) => f.trim().length > 0);
      } catch (error) {
        console.error('Failed to get changed files from git:', error);
      }
      i++;
    } else if (args[i] === '--strict') {
      strict = true;
    } else if (args[i] === '--format' && args[i + 1]) {
      outputFormat = args[i + 1];
      i++;
    }
  }

  return { changedFiles, strict, outputFormat };
}

function findCoverageMapping(file: string): CoverageMapping | undefined {
  return COVERAGE_MAPPINGS.find((mapping) => mapping.pattern.test(file));
}

function extractLastUpdated(threatModelPath: string): string | undefined {
  const fullPath = path.join(process.cwd(), threatModelPath);

  if (!fs.existsSync(fullPath)) {
    return undefined;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');

  // Look for "Last Updated" in frontmatter or content
  const patterns = [
    />\s*\*\*Last Updated\*\*:\s*(\d{4}-\d{2}-\d{2})/i,
    /last[_\s]updated:\s*(\d{4}-\d{2}-\d{2})/i,
    /\*\*Last Updated\*\*:\s*(\d{4}-\d{2}-\d{2})/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return undefined;
}

function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function checkFile(file: string): CheckResult | null {
  const mapping = findCoverageMapping(file);

  if (!mapping) {
    // File doesn't require threat model coverage
    return null;
  }

  const threatModelPath = path.join(process.cwd(), mapping.threatModel);
  const threatModelExists = fs.existsSync(threatModelPath);

  if (!threatModelExists) {
    return {
      file,
      feature: mapping.feature,
      threatModel: mapping.threatModel,
      riskTier: mapping.riskTier,
      status: 'missing',
      message: `Threat model not found: ${mapping.threatModel}`,
    };
  }

  const lastUpdated = extractLastUpdated(mapping.threatModel);

  if (!lastUpdated) {
    return {
      file,
      feature: mapping.feature,
      threatModel: mapping.threatModel,
      riskTier: mapping.riskTier,
      status: 'stale',
      message: `Threat model exists but "Last Updated" date not found`,
    };
  }

  const daysSinceUpdate = daysSince(lastUpdated);

  if (daysSinceUpdate > mapping.stalenessThresholdDays) {
    return {
      file,
      feature: mapping.feature,
      threatModel: mapping.threatModel,
      riskTier: mapping.riskTier,
      status: 'stale',
      lastUpdated,
      daysSinceUpdate,
      message: `Threat model is stale (${daysSinceUpdate} days old, threshold: ${mapping.stalenessThresholdDays} days)`,
    };
  }

  return {
    file,
    feature: mapping.feature,
    threatModel: mapping.threatModel,
    riskTier: mapping.riskTier,
    status: 'present',
    lastUpdated,
    daysSinceUpdate,
    message: `Threat model is current (updated ${daysSinceUpdate} days ago)`,
  };
}

function generateSummary(results: CheckResult[]): SummaryResult {
  const uniqueResults = new Map<string, CheckResult>();

  // Deduplicate by threat model
  for (const result of results) {
    const key = result.threatModel;
    const existing = uniqueResults.get(key);

    // Keep the worst status for each threat model
    if (
      !existing ||
      (result.status === 'missing' && existing.status !== 'missing') ||
      (result.status === 'stale' && existing.status === 'present')
    ) {
      uniqueResults.set(key, result);
    }
  }

  const dedupedResults = Array.from(uniqueResults.values());

  const hasCriticalIssues = dedupedResults.some(
    (r) => r.riskTier === 'Critical' && r.status !== 'present'
  );

  const hasHighIssues = dedupedResults.some(
    (r) => r.riskTier === 'High' && r.status !== 'present'
  );

  return {
    totalFiles: results.length,
    coveredFiles: results.filter((r) => r.status === 'present').length,
    results: dedupedResults,
    hasCriticalIssues,
    hasHighIssues,
  };
}

function formatTextOutput(summary: SummaryResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('='.repeat(70));
  lines.push('THREAT MODEL COVERAGE CHECK');
  lines.push('='.repeat(70));
  lines.push('');

  if (summary.results.length === 0) {
    lines.push('No files requiring threat model coverage were changed.');
    lines.push('');
    return lines.join('\n');
  }

  // Group by status
  const missing = summary.results.filter((r) => r.status === 'missing');
  const stale = summary.results.filter((r) => r.status === 'stale');
  const present = summary.results.filter((r) => r.status === 'present');

  if (missing.length > 0) {
    lines.push('MISSING THREAT MODELS:');
    lines.push('-'.repeat(40));
    for (const r of missing) {
      lines.push(`  [${r.riskTier}] ${r.feature}`);
      lines.push(`         Expected: ${r.threatModel}`);
    }
    lines.push('');
  }

  if (stale.length > 0) {
    lines.push('STALE THREAT MODELS:');
    lines.push('-'.repeat(40));
    for (const r of stale) {
      lines.push(`  [${r.riskTier}] ${r.feature}`);
      lines.push(`         File: ${r.threatModel}`);
      lines.push(`         ${r.message}`);
    }
    lines.push('');
  }

  if (present.length > 0) {
    lines.push('CURRENT THREAT MODELS:');
    lines.push('-'.repeat(40));
    for (const r of present) {
      lines.push(`  [${r.riskTier}] ${r.feature} - OK (${r.daysSinceUpdate} days old)`);
    }
    lines.push('');
  }

  lines.push('='.repeat(70));
  lines.push('SUMMARY');
  lines.push('='.repeat(70));
  lines.push(`Total features touched: ${summary.results.length}`);
  lines.push(`Current: ${present.length}`);
  lines.push(`Stale: ${stale.length}`);
  lines.push(`Missing: ${missing.length}`);
  lines.push('');

  if (summary.hasCriticalIssues) {
    lines.push('WARNING: Critical-tier features have missing or stale threat models!');
  }

  if (summary.hasHighIssues) {
    lines.push('NOTICE: High-tier features have missing or stale threat models.');
  }

  if (!summary.hasCriticalIssues && !summary.hasHighIssues) {
    lines.push('All threat models are current.');
  }

  lines.push('');

  return lines.join('\n');
}

function formatMarkdownOutput(summary: SummaryResult): string {
  const lines: string[] = [];

  lines.push('## Threat Model Coverage Check');
  lines.push('');

  if (summary.results.length === 0) {
    lines.push('No files requiring threat model coverage were changed.');
    return lines.join('\n');
  }

  const missing = summary.results.filter((r) => r.status === 'missing');
  const stale = summary.results.filter((r) => r.status === 'stale');
  const present = summary.results.filter((r) => r.status === 'present');

  // Status badge
  if (summary.hasCriticalIssues) {
    lines.push('> **Status**: Action Required');
    lines.push('');
  } else if (summary.hasHighIssues) {
    lines.push('> **Status**: Review Recommended');
    lines.push('');
  } else {
    lines.push('> **Status**: All Clear');
    lines.push('');
  }

  lines.push('| Feature | Risk Tier | Threat Model | Status |');
  lines.push('|---------|-----------|--------------|--------|');

  for (const r of summary.results) {
    const statusEmoji =
      r.status === 'present' ? 'Current' : r.status === 'stale' ? 'Stale' : 'Missing';
    const link =
      r.status !== 'missing' ? `[View](${r.threatModel})` : 'Not found';
    lines.push(`| ${r.feature} | ${r.riskTier} | ${link} | ${statusEmoji} |`);
  }

  lines.push('');

  if (missing.length > 0 || stale.length > 0) {
    lines.push('### Recommendations');
    lines.push('');

    if (missing.length > 0) {
      lines.push(
        '- **Missing threat models**: Please create threat models for the features listed above.'
      );
      lines.push(
        '  Use the [template](docs/security/threat-models/template.md) as a starting point.'
      );
    }

    if (stale.length > 0) {
      lines.push(
        '- **Stale threat models**: Please review and update the threat models listed above.'
      );
      lines.push('  Update the "Last Updated" date after review.');
    }

    lines.push('');
    lines.push(
      'See [Threat Modeling Framework](docs/security/threat-modeling-framework.md) for guidance.'
    );
  }

  return lines.join('\n');
}

function formatJsonOutput(summary: SummaryResult): string {
  return JSON.stringify(
    {
      totalFeatures: summary.results.length,
      currentCount: summary.results.filter((r) => r.status === 'present').length,
      staleCount: summary.results.filter((r) => r.status === 'stale').length,
      missingCount: summary.results.filter((r) => r.status === 'missing').length,
      hasCriticalIssues: summary.hasCriticalIssues,
      hasHighIssues: summary.hasHighIssues,
      results: summary.results,
    },
    null,
    2
  );
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  const { changedFiles, strict, outputFormat } = parseArgs();

  if (changedFiles.length === 0) {
    console.log('No changed files specified. Use --changed-files or --base-ref');
    console.log('');
    console.log('Usage:');
    console.log(
      '  npx ts-node scripts/security/check-threat-model-coverage.ts --changed-files "file1.ts,file2.ts"'
    );
    console.log(
      '  npx ts-node scripts/security/check-threat-model-coverage.ts --base-ref main'
    );
    console.log('');
    console.log('Options:');
    console.log('  --strict        Exit with error code 1 if critical issues found');
    console.log('  --format        Output format: text, markdown, json (default: text)');
    process.exit(0);
  }

  // Check each file
  const results: CheckResult[] = [];
  for (const file of changedFiles) {
    const result = checkFile(file);
    if (result) {
      results.push(result);
    }
  }

  const summary = generateSummary(results);

  // Output results
  let output: string;
  switch (outputFormat) {
    case 'markdown':
      output = formatMarkdownOutput(summary);
      break;
    case 'json':
      output = formatJsonOutput(summary);
      break;
    default:
      output = formatTextOutput(summary);
  }

  console.log(output);

  // Exit code
  if (strict && summary.hasCriticalIssues) {
    process.exit(1);
  }

  process.exit(0);
}

main();
