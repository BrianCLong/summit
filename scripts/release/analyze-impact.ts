#!/usr/bin/env npx tsx
/**
 * Release Impact Analyzer
 *
 * Analyzes the potential impact of a release:
 * - Code change analysis
 * - Risk assessment
 * - Affected components
 * - Test coverage gaps
 * - Performance implications
 *
 * Usage:
 *   npx tsx scripts/release/analyze-impact.ts [from-tag] [to-ref]
 *   pnpm release:impact v5.2.0 HEAD
 *
 * Options:
 *   --output <path>    Output file path
 *   --format <fmt>     Output format: text, json, markdown (default: text)
 *   --threshold <n>    Risk threshold to fail CI: low, medium, high (default: high)
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

interface FileChange {
  path: string;
  status: 'A' | 'M' | 'D' | 'R';
  additions: number;
  deletions: number;
  component: string;
  riskFactors: string[];
}

interface Component {
  name: string;
  files: number;
  additions: number;
  deletions: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
}

interface ImpactReport {
  timestamp: string;
  fromRef: string;
  toRef: string;
  summary: {
    totalFiles: number;
    additions: number;
    deletions: number;
    commits: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
  };
  components: Component[];
  changes: FileChange[];
  risks: {
    category: string;
    level: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    files: string[];
  }[];
  recommendations: string[];
  testCoverage: {
    hasNewTests: boolean;
    affectedTests: string[];
    coverageGaps: string[];
  };
}

const COMPONENT_PATTERNS: Record<string, RegExp> = {
  'API': /^(server\/src\/api|server\/src\/routes|packages\/.*-api)/,
  'Database': /^(server\/src\/db|packages\/db|prisma|knex|migration)/,
  'Authentication': /^(server\/src\/auth|packages\/auth|server\/src\/middleware\/auth)/,
  'Frontend': /^(client\/|apps\/web\/)/,
  'Infrastructure': /^(deploy\/|\.github\/|infrastructure\/|helm\/)/,
  'Configuration': /^(\.env|config\/|server\/src\/config)/,
  'Tests': /^(.*\.test\.|.*\.spec\.|test\/|__tests__\/)/,
  'Documentation': /^(docs\/|.*\.md$|README)/,
  'Dependencies': /^(package\.json|pnpm-lock\.yaml|requirements\.txt)/,
  'Security': /^(.*security|.*auth|.*crypt|.*secret|.*token)/i,
  'Core': /^(server\/src\/core|packages\/core)/,
  'Services': /^(services\/|server\/src\/services)/,
  'Workers': /^(workers\/|server\/src\/workers|packages\/.*-worker)/,
};

const RISK_PATTERNS: Array<{ pattern: RegExp; risk: string; level: 'medium' | 'high' | 'critical' }> = [
  { pattern: /migration|migrate/i, risk: 'Database migration', level: 'high' },
  { pattern: /\.env|secret|password|key|token/i, risk: 'Sensitive configuration', level: 'critical' },
  { pattern: /auth|login|session|jwt/i, risk: 'Authentication changes', level: 'high' },
  { pattern: /security|crypt|hash/i, risk: 'Security-related code', level: 'high' },
  { pattern: /payment|billing|invoice/i, risk: 'Payment processing', level: 'critical' },
  { pattern: /delete|remove|drop|truncate/i, risk: 'Destructive operations', level: 'high' },
  { pattern: /cache|redis|memcache/i, risk: 'Caching layer', level: 'medium' },
  { pattern: /queue|worker|job/i, risk: 'Background processing', level: 'medium' },
  { pattern: /api\/v\d|breaking/i, risk: 'API versioning', level: 'high' },
  { pattern: /index\.(ts|js)$/i, risk: 'Entry point modification', level: 'medium' },
  { pattern: /package\.json/i, risk: 'Dependency changes', level: 'medium' },
  { pattern: /dockerfile|compose|k8s|helm/i, risk: 'Infrastructure changes', level: 'high' },
  { pattern: /\.github\/workflows/i, risk: 'CI/CD pipeline changes', level: 'medium' },
];

function run(cmd: string, args: string[]): { success: boolean; output: string } {
  const result = spawnSync(cmd, args, { encoding: 'utf8', stdio: 'pipe' });
  return {
    success: result.status === 0,
    output: result.stdout?.trim() ?? '',
  };
}

function getLatestTag(): string | null {
  const result = run('git', ['tag', '-l', 'v*.*.*', '--sort=-v:refname']);
  if (!result.success || !result.output) return null;
  return result.output.split('\n')[0] || null;
}

function getCommitCount(fromRef: string, toRef: string): number {
  const result = run('git', ['rev-list', '--count', `${fromRef}..${toRef}`]);
  return parseInt(result.output, 10) || 0;
}

function getFileChanges(fromRef: string, toRef: string): FileChange[] {
  // Get file status
  const statusResult = run('git', ['diff', '--name-status', fromRef, toRef]);
  const numstatResult = run('git', ['diff', '--numstat', fromRef, toRef]);

  const changes: FileChange[] = [];
  const statusLines = statusResult.output.split('\n').filter(Boolean);
  const numstatLines = numstatResult.output.split('\n').filter(Boolean);

  // Parse numstat for additions/deletions
  const stats = new Map<string, { additions: number; deletions: number }>();
  for (const line of numstatLines) {
    const [add, del, file] = line.split('\t');
    stats.set(file, {
      additions: parseInt(add, 10) || 0,
      deletions: parseInt(del, 10) || 0,
    });
  }

  for (const line of statusLines) {
    const parts = line.split('\t');
    const status = parts[0][0] as FileChange['status'];
    const filePath = parts[parts.length - 1];

    const fileStat = stats.get(filePath) || { additions: 0, deletions: 0 };
    const component = identifyComponent(filePath);
    const riskFactors = identifyRisks(filePath);

    changes.push({
      path: filePath,
      status,
      additions: fileStat.additions,
      deletions: fileStat.deletions,
      component,
      riskFactors,
    });
  }

  return changes;
}

function identifyComponent(filePath: string): string {
  for (const [component, pattern] of Object.entries(COMPONENT_PATTERNS)) {
    if (pattern.test(filePath)) {
      return component;
    }
  }
  return 'Other';
}

function identifyRisks(filePath: string): string[] {
  const risks: string[] = [];
  for (const { pattern, risk } of RISK_PATTERNS) {
    if (pattern.test(filePath)) {
      risks.push(risk);
    }
  }
  return risks;
}

function aggregateComponents(changes: FileChange[]): Component[] {
  const componentMap = new Map<string, Component>();

  for (const change of changes) {
    const existing = componentMap.get(change.component);
    if (existing) {
      existing.files++;
      existing.additions += change.additions;
      existing.deletions += change.deletions;
      for (const risk of change.riskFactors) {
        if (!existing.riskFactors.includes(risk)) {
          existing.riskFactors.push(risk);
        }
      }
    } else {
      componentMap.set(change.component, {
        name: change.component,
        files: 1,
        additions: change.additions,
        deletions: change.deletions,
        riskLevel: 'low',
        riskFactors: [...change.riskFactors],
      });
    }
  }

  // Calculate risk level for each component
  for (const component of componentMap.values()) {
    component.riskLevel = calculateComponentRisk(component);
  }

  return Array.from(componentMap.values()).sort((a, b) => {
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
  });
}

function calculateComponentRisk(component: Component): 'low' | 'medium' | 'high' | 'critical' {
  // Check for critical risk factors
  const criticalRisks = component.riskFactors.filter(r =>
    RISK_PATTERNS.find(p => p.risk === r && p.level === 'critical')
  );
  if (criticalRisks.length > 0) return 'critical';

  // Check for high risk factors
  const highRisks = component.riskFactors.filter(r =>
    RISK_PATTERNS.find(p => p.risk === r && p.level === 'high')
  );
  if (highRisks.length > 0) return 'high';

  // Large changes are risky
  if (component.additions + component.deletions > 500) return 'high';
  if (component.additions + component.deletions > 200) return 'medium';

  // Medium risk factors
  if (component.riskFactors.length > 0) return 'medium';

  // Component-based risk
  if (['Database', 'Authentication', 'Security'].includes(component.name)) return 'medium';

  return 'low';
}

function aggregateRisks(changes: FileChange[]): ImpactReport['risks'] {
  const riskMap = new Map<string, { level: 'low' | 'medium' | 'high' | 'critical'; files: string[] }>();

  for (const change of changes) {
    for (const risk of change.riskFactors) {
      const riskDef = RISK_PATTERNS.find(p => p.risk === risk);
      const existing = riskMap.get(risk);

      if (existing) {
        existing.files.push(change.path);
      } else {
        riskMap.set(risk, {
          level: riskDef?.level || 'medium',
          files: [change.path],
        });
      }
    }
  }

  return Array.from(riskMap.entries()).map(([category, data]) => ({
    category,
    level: data.level,
    description: `${data.files.length} file(s) with ${category.toLowerCase()}`,
    files: data.files,
  })).sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.level] - order[b.level];
  });
}

function calculateOverallRisk(
  components: Component[],
  risks: ImpactReport['risks'],
  totalChanges: number
): { level: 'low' | 'medium' | 'high' | 'critical'; score: number } {
  let score = 0;

  // Component risk contribution
  for (const component of components) {
    switch (component.riskLevel) {
      case 'critical': score += 40; break;
      case 'high': score += 20; break;
      case 'medium': score += 10; break;
      case 'low': score += 2; break;
    }
  }

  // Risk factor contribution
  for (const risk of risks) {
    switch (risk.level) {
      case 'critical': score += 30; break;
      case 'high': score += 15; break;
      case 'medium': score += 5; break;
    }
  }

  // Size contribution
  if (totalChanges > 1000) score += 20;
  else if (totalChanges > 500) score += 10;
  else if (totalChanges > 200) score += 5;

  // Determine level
  let level: 'low' | 'medium' | 'high' | 'critical';
  if (score >= 100) level = 'critical';
  else if (score >= 50) level = 'high';
  else if (score >= 20) level = 'medium';
  else level = 'low';

  return { level, score };
}

function analyzeTestCoverage(changes: FileChange[]): ImpactReport['testCoverage'] {
  const testFiles = changes.filter(c => COMPONENT_PATTERNS['Tests'].test(c.path));
  const nonTestChanges = changes.filter(c => !COMPONENT_PATTERNS['Tests'].test(c.path));

  // Find files without corresponding tests
  const coverageGaps: string[] = [];
  for (const change of nonTestChanges) {
    if (change.path.endsWith('.ts') || change.path.endsWith('.tsx') || change.path.endsWith('.js')) {
      const hasTest = testFiles.some(t =>
        t.path.includes(path.basename(change.path, path.extname(change.path)))
      );
      if (!hasTest && !change.path.includes('index.')) {
        coverageGaps.push(change.path);
      }
    }
  }

  return {
    hasNewTests: testFiles.length > 0,
    affectedTests: testFiles.map(t => t.path),
    coverageGaps: coverageGaps.slice(0, 10), // Limit to 10
  };
}

function generateRecommendations(report: ImpactReport): string[] {
  const recommendations: string[] = [];

  // Risk-based recommendations
  if (report.summary.riskLevel === 'critical') {
    recommendations.push('CRITICAL: Consider splitting this release into smaller, lower-risk deployments');
    recommendations.push('Schedule deployment during low-traffic period with full team availability');
  }

  if (report.risks.some(r => r.category === 'Database migration')) {
    recommendations.push('Create database backup before deployment');
    recommendations.push('Test migration rollback procedure');
    recommendations.push('Consider deploying during maintenance window');
  }

  if (report.risks.some(r => r.category === 'Authentication changes')) {
    recommendations.push('Thoroughly test all authentication flows');
    recommendations.push('Verify session handling after deployment');
    recommendations.push('Have rollback plan ready for auth issues');
  }

  if (report.risks.some(r => r.category === 'Infrastructure changes')) {
    recommendations.push('Review infrastructure changes with ops team');
    recommendations.push('Test in staging environment first');
  }

  if (report.testCoverage.coverageGaps.length > 0) {
    recommendations.push(`Add tests for ${report.testCoverage.coverageGaps.length} modified files without test coverage`);
  }

  if (!report.testCoverage.hasNewTests && report.summary.additions > 100) {
    recommendations.push('Consider adding tests for new functionality');
  }

  if (report.summary.totalFiles > 50) {
    recommendations.push('Large changeset - consider incremental deployment');
  }

  // Component-specific recommendations
  const criticalComponents = report.components.filter(c => c.riskLevel === 'critical');
  for (const component of criticalComponents) {
    recommendations.push(`Review ${component.name} changes carefully: ${component.riskFactors.join(', ')}`);
  }

  return recommendations;
}

function formatTextReport(report: ImpactReport): void {
  const riskColors: Record<string, string> = {
    critical: '\x1b[31m', // Red
    high: '\x1b[33m',     // Yellow
    medium: '\x1b[36m',   // Cyan
    low: '\x1b[32m',      // Green
  };
  const reset = '\x1b[0m';

  console.log('\n========================================');
  console.log('  Release Impact Analysis');
  console.log('========================================\n');

  console.log(`Analysis: ${report.fromRef} → ${report.toRef}`);
  console.log(`Generated: ${report.timestamp}\n`);

  // Summary
  const riskColor = riskColors[report.summary.riskLevel];
  console.log('Summary:');
  console.log(`   Files changed: ${report.summary.totalFiles}`);
  console.log(`   Additions:     +${report.summary.additions}`);
  console.log(`   Deletions:     -${report.summary.deletions}`);
  console.log(`   Commits:       ${report.summary.commits}`);
  console.log(`   Risk Level:    ${riskColor}${report.summary.riskLevel.toUpperCase()}${reset} (score: ${report.summary.riskScore})`);

  // Components
  console.log('\nComponents Affected:');
  for (const component of report.components) {
    const color = riskColors[component.riskLevel];
    console.log(`   ${color}[${component.riskLevel.toUpperCase().padEnd(8)}]${reset} ${component.name}`);
    console.log(`      Files: ${component.files}, +${component.additions}/-${component.deletions}`);
    if (component.riskFactors.length > 0) {
      console.log(`      Risks: ${component.riskFactors.join(', ')}`);
    }
  }

  // Risks
  if (report.risks.length > 0) {
    console.log('\nIdentified Risks:');
    for (const risk of report.risks) {
      const color = riskColors[risk.level];
      console.log(`   ${color}[${risk.level.toUpperCase()}]${reset} ${risk.category}`);
      console.log(`      ${risk.description}`);
    }
  }

  // Test coverage
  console.log('\nTest Coverage:');
  console.log(`   New tests added: ${report.testCoverage.hasNewTests ? 'Yes' : 'No'}`);
  console.log(`   Affected tests:  ${report.testCoverage.affectedTests.length}`);
  if (report.testCoverage.coverageGaps.length > 0) {
    console.log(`   Coverage gaps:   ${report.testCoverage.coverageGaps.length} files`);
    for (const gap of report.testCoverage.coverageGaps.slice(0, 5)) {
      console.log(`      - ${gap}`);
    }
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log('\nRecommendations:');
    for (const rec of report.recommendations) {
      console.log(`   • ${rec}`);
    }
  }

  console.log('');
}

function formatMarkdownReport(report: ImpactReport): string {
  const sections: string[] = [];

  sections.push(`# Release Impact Analysis

**Analysis:** ${report.fromRef} → ${report.toRef}
**Generated:** ${report.timestamp}

---

## Summary

| Metric | Value |
|--------|-------|
| Files Changed | ${report.summary.totalFiles} |
| Additions | +${report.summary.additions} |
| Deletions | -${report.summary.deletions} |
| Commits | ${report.summary.commits} |
| **Risk Level** | **${report.summary.riskLevel.toUpperCase()}** (score: ${report.summary.riskScore}) |`);

  // Components
  sections.push(`## Components Affected

| Component | Risk | Files | Changes | Risk Factors |
|-----------|------|-------|---------|--------------|
${report.components.map(c =>
  `| ${c.name} | ${c.riskLevel.toUpperCase()} | ${c.files} | +${c.additions}/-${c.deletions} | ${c.riskFactors.join(', ') || '-'} |`
).join('\n')}`);

  // Risks
  if (report.risks.length > 0) {
    sections.push(`## Identified Risks

${report.risks.map(r => `### ${r.level.toUpperCase()}: ${r.category}

${r.description}

Files:
${r.files.slice(0, 5).map(f => `- \`${f}\``).join('\n')}
${r.files.length > 5 ? `\n*...and ${r.files.length - 5} more*` : ''}`).join('\n\n')}`);
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    sections.push(`## Recommendations

${report.recommendations.map(r => `- ${r}`).join('\n')}`);
  }

  return sections.join('\n\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let fromRef = getLatestTag() || 'HEAD~10';
  let toRef = 'HEAD';
  let outputPath: string | undefined;
  let format = 'text';
  let threshold: 'low' | 'medium' | 'high' = 'high';

  const positionalArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--output':
        outputPath = args[++i];
        break;
      case '--format':
        format = args[++i];
        break;
      case '--threshold':
        threshold = args[++i] as typeof threshold;
        break;
      case '--help':
      case '-h':
        console.log(`
Release Impact Analyzer

Usage: npx tsx scripts/release/analyze-impact.ts [from-ref] [to-ref] [options]

Arguments:
  from-ref    Starting reference (tag, commit, branch) - default: latest tag
  to-ref      Ending reference - default: HEAD

Options:
  --output <path>      Output file path
  --format <fmt>       Output format: text, json, markdown (default: text)
  --threshold <level>  Risk threshold to fail: low, medium, high (default: high)

Examples:
  pnpm release:impact
  pnpm release:impact v5.2.0 HEAD
  pnpm release:impact v5.2.0 v5.3.0 --format markdown
  pnpm release:impact --threshold medium
`);
        process.exit(0);
      default:
        if (!args[i].startsWith('--')) {
          positionalArgs.push(args[i]);
        }
    }
  }

  if (positionalArgs.length >= 1) fromRef = positionalArgs[0];
  if (positionalArgs.length >= 2) toRef = positionalArgs[1];

  console.log('========================================');
  console.log('  Release Impact Analyzer');
  console.log('========================================\n');

  console.log(`[impact] Analyzing: ${fromRef} → ${toRef}`);

  const changes = getFileChanges(fromRef, toRef);
  const components = aggregateComponents(changes);
  const risks = aggregateRisks(changes);
  const commits = getCommitCount(fromRef, toRef);
  const testCoverage = analyzeTestCoverage(changes);

  const totalAdditions = changes.reduce((sum, c) => sum + c.additions, 0);
  const totalDeletions = changes.reduce((sum, c) => sum + c.deletions, 0);

  const { level: riskLevel, score: riskScore } = calculateOverallRisk(
    components,
    risks,
    totalAdditions + totalDeletions
  );

  const report: ImpactReport = {
    timestamp: new Date().toISOString(),
    fromRef,
    toRef,
    summary: {
      totalFiles: changes.length,
      additions: totalAdditions,
      deletions: totalDeletions,
      commits,
      riskLevel,
      riskScore,
    },
    components,
    changes,
    risks,
    recommendations: [],
    testCoverage,
  };

  report.recommendations = generateRecommendations(report);

  // Output
  let content: string;
  switch (format) {
    case 'json':
      content = JSON.stringify(report, null, 2);
      break;
    case 'markdown':
      content = formatMarkdownReport(report);
      break;
    case 'text':
    default:
      formatTextReport(report);
      content = '';
  }

  if (outputPath && content) {
    fs.writeFileSync(outputPath, content);
    console.log(`Report saved to: ${outputPath}`);
  } else if (content) {
    console.log(content);
  }

  // Check threshold
  const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
  if (riskOrder[riskLevel] >= riskOrder[threshold]) {
    console.log(`\n[WARN] Risk level (${riskLevel}) meets or exceeds threshold (${threshold})`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
