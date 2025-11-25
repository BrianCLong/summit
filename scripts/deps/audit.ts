#!/usr/bin/env npx tsx
/**
 * P25: Dependency Audit Script
 * Comprehensive dependency auditing with severity filtering and reporting
 */

import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '../..');

interface AuditVulnerability {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'info';
  module: string;
  version: string;
  fixAvailable: boolean;
  path: string[];
  recommendation: string;
  cwe: string[];
  cvss: number | null;
  url: string;
}

interface AuditReport {
  timestamp: string;
  totalDependencies: number;
  vulnerabilities: AuditVulnerability[];
  summary: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
    info: number;
    total: number;
  };
  outdated: OutdatedPackage[];
  duplicates: DuplicatePackage[];
}

interface OutdatedPackage {
  name: string;
  current: string;
  wanted: string;
  latest: string;
  type: 'dependencies' | 'devDependencies' | 'peerDependencies';
  workspace?: string;
}

interface DuplicatePackage {
  name: string;
  versions: string[];
  count: number;
}

interface AuditConfig {
  failOnSeverity: 'critical' | 'high' | 'moderate' | 'low' | 'none';
  ignoreIds: string[];
  ignorePatterns: string[];
  checkOutdated: boolean;
  checkDuplicates: boolean;
  outputFormat: 'json' | 'markdown' | 'console';
  outputPath?: string;
}

const DEFAULT_CONFIG: AuditConfig = {
  failOnSeverity: 'high',
  ignoreIds: [],
  ignorePatterns: [],
  checkOutdated: true,
  checkDuplicates: true,
  outputFormat: 'console',
};

function loadConfig(): AuditConfig {
  const configPath = join(ROOT_DIR, '.audit-config.json');
  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    return { ...DEFAULT_CONFIG, ...config };
  }
  return DEFAULT_CONFIG;
}

function runPnpmAudit(): AuditVulnerability[] {
  console.log('Running pnpm audit...');

  try {
    const result = spawnSync('pnpm', ['audit', '--json'], {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    if (result.error) {
      console.error('Error running pnpm audit:', result.error);
      return [];
    }

    const output = result.stdout || '{}';
    const auditData = JSON.parse(output);

    const vulnerabilities: AuditVulnerability[] = [];

    if (auditData.advisories) {
      for (const [id, advisory] of Object.entries(auditData.advisories as Record<string, unknown>)) {
        const adv = advisory as Record<string, unknown>;
        vulnerabilities.push({
          id,
          title: adv.title as string,
          severity: adv.severity as AuditVulnerability['severity'],
          module: adv.module_name as string,
          version: adv.vulnerable_versions as string,
          fixAvailable: Boolean(adv.patched_versions),
          path: (adv.findings as Array<{ paths: string[] }>)?.[0]?.paths || [],
          recommendation: adv.recommendation as string || 'Update to patched version',
          cwe: (adv.cwe as string[]) || [],
          cvss: adv.cvss?.score as number || null,
          url: adv.url as string,
        });
      }
    }

    return vulnerabilities;
  } catch (error) {
    console.error('Failed to parse audit output:', error);
    return [];
  }
}

function checkOutdated(): OutdatedPackage[] {
  console.log('Checking for outdated packages...');

  try {
    const result = spawnSync('pnpm', ['outdated', '--json'], {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    const output = result.stdout || '{}';
    const outdatedData = JSON.parse(output);

    const packages: OutdatedPackage[] = [];

    for (const [name, info] of Object.entries(outdatedData as Record<string, unknown>)) {
      const pkg = info as Record<string, string>;
      packages.push({
        name,
        current: pkg.current,
        wanted: pkg.wanted,
        latest: pkg.latest,
        type: pkg.dependencyType as OutdatedPackage['type'],
        workspace: pkg.workspace,
      });
    }

    return packages;
  } catch {
    return [];
  }
}

function findDuplicates(): DuplicatePackage[] {
  console.log('Checking for duplicate packages...');

  try {
    const result = spawnSync('pnpm', ['why', '--json'], {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    // Parse pnpm-lock.yaml to find duplicates
    const lockfilePath = join(ROOT_DIR, 'pnpm-lock.yaml');
    if (!existsSync(lockfilePath)) {
      return [];
    }

    const lockfile = readFileSync(lockfilePath, 'utf-8');
    const versionMap = new Map<string, Set<string>>();

    // Simple regex-based parsing for version detection
    const packageRegex = /^\s+'?(@?[^@\s:]+)@([^:'\s]+)'?:/gm;
    let match;

    while ((match = packageRegex.exec(lockfile)) !== null) {
      const [, name, version] = match;
      if (!versionMap.has(name)) {
        versionMap.set(name, new Set());
      }
      versionMap.get(name)!.add(version);
    }

    const duplicates: DuplicatePackage[] = [];
    for (const [name, versions] of versionMap) {
      if (versions.size > 1) {
        duplicates.push({
          name,
          versions: Array.from(versions),
          count: versions.size,
        });
      }
    }

    return duplicates.sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

function countDependencies(): number {
  try {
    const result = spawnSync('pnpm', ['list', '--depth=0', '--json'], {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
    });
    const data = JSON.parse(result.stdout || '[]');
    return data.reduce((acc: number, pkg: { dependencies?: object; devDependencies?: object }) => {
      return acc +
        Object.keys(pkg.dependencies || {}).length +
        Object.keys(pkg.devDependencies || {}).length;
    }, 0);
  } catch {
    return 0;
  }
}

function filterVulnerabilities(
  vulnerabilities: AuditVulnerability[],
  config: AuditConfig
): AuditVulnerability[] {
  return vulnerabilities.filter(v => {
    // Check ignored IDs
    if (config.ignoreIds.includes(v.id)) {
      return false;
    }

    // Check ignored patterns
    for (const pattern of config.ignorePatterns) {
      if (new RegExp(pattern).test(v.module)) {
        return false;
      }
    }

    return true;
  });
}

function formatMarkdown(report: AuditReport): string {
  const lines: string[] = [
    '# Dependency Audit Report',
    '',
    `**Generated:** ${report.timestamp}`,
    `**Total Dependencies:** ${report.totalDependencies}`,
    '',
    '## Vulnerability Summary',
    '',
    '| Severity | Count |',
    '|----------|-------|',
    `| Critical | ${report.summary.critical} |`,
    `| High | ${report.summary.high} |`,
    `| Moderate | ${report.summary.moderate} |`,
    `| Low | ${report.summary.low} |`,
    `| Info | ${report.summary.info} |`,
    `| **Total** | **${report.summary.total}** |`,
    '',
  ];

  if (report.vulnerabilities.length > 0) {
    lines.push('## Vulnerabilities');
    lines.push('');

    for (const v of report.vulnerabilities) {
      const severityBadge = {
        critical: '🔴',
        high: '🟠',
        moderate: '🟡',
        low: '🟢',
        info: '🔵',
      }[v.severity];

      lines.push(`### ${severityBadge} ${v.title}`);
      lines.push('');
      lines.push(`- **Module:** ${v.module}`);
      lines.push(`- **Severity:** ${v.severity.toUpperCase()}`);
      lines.push(`- **Version:** ${v.version}`);
      lines.push(`- **Fix Available:** ${v.fixAvailable ? 'Yes' : 'No'}`);
      if (v.cvss) {
        lines.push(`- **CVSS Score:** ${v.cvss}`);
      }
      lines.push(`- **URL:** ${v.url}`);
      lines.push(`- **Recommendation:** ${v.recommendation}`);
      lines.push('');
    }
  }

  if (report.outdated.length > 0) {
    lines.push('## Outdated Packages');
    lines.push('');
    lines.push('| Package | Current | Wanted | Latest |');
    lines.push('|---------|---------|--------|--------|');

    for (const pkg of report.outdated.slice(0, 50)) {
      lines.push(`| ${pkg.name} | ${pkg.current} | ${pkg.wanted} | ${pkg.latest} |`);
    }

    if (report.outdated.length > 50) {
      lines.push(`| ... and ${report.outdated.length - 50} more | | | |`);
    }
    lines.push('');
  }

  if (report.duplicates.length > 0) {
    lines.push('## Duplicate Packages');
    lines.push('');
    lines.push('| Package | Versions | Count |');
    lines.push('|---------|----------|-------|');

    for (const dup of report.duplicates.slice(0, 30)) {
      lines.push(`| ${dup.name} | ${dup.versions.join(', ')} | ${dup.count} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatConsole(report: AuditReport): void {
  console.log('\n========================================');
  console.log('       DEPENDENCY AUDIT REPORT');
  console.log('========================================\n');

  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Total Dependencies: ${report.totalDependencies}`);

  console.log('\n--- Vulnerability Summary ---');
  console.log(`  Critical: ${report.summary.critical}`);
  console.log(`  High:     ${report.summary.high}`);
  console.log(`  Moderate: ${report.summary.moderate}`);
  console.log(`  Low:      ${report.summary.low}`);
  console.log(`  Info:     ${report.summary.info}`);
  console.log(`  Total:    ${report.summary.total}`);

  if (report.vulnerabilities.length > 0) {
    console.log('\n--- Vulnerabilities ---');
    for (const v of report.vulnerabilities) {
      const icon = {
        critical: '🔴',
        high: '🟠',
        moderate: '🟡',
        low: '🟢',
        info: '🔵',
      }[v.severity];
      console.log(`\n${icon} [${v.severity.toUpperCase()}] ${v.title}`);
      console.log(`   Module: ${v.module}@${v.version}`);
      console.log(`   Fix Available: ${v.fixAvailable ? 'Yes' : 'No'}`);
      console.log(`   URL: ${v.url}`);
    }
  }

  if (report.outdated.length > 0) {
    console.log(`\n--- Outdated Packages (${report.outdated.length} total) ---`);
    for (const pkg of report.outdated.slice(0, 10)) {
      console.log(`  ${pkg.name}: ${pkg.current} → ${pkg.latest}`);
    }
    if (report.outdated.length > 10) {
      console.log(`  ... and ${report.outdated.length - 10} more`);
    }
  }

  if (report.duplicates.length > 0) {
    console.log(`\n--- Duplicate Packages (${report.duplicates.length} total) ---`);
    for (const dup of report.duplicates.slice(0, 10)) {
      console.log(`  ${dup.name}: ${dup.count} versions (${dup.versions.join(', ')})`);
    }
  }

  console.log('\n========================================\n');
}

function shouldFail(report: AuditReport, config: AuditConfig): boolean {
  const severityOrder = ['info', 'low', 'moderate', 'high', 'critical'];
  const thresholdIndex = severityOrder.indexOf(config.failOnSeverity);

  if (config.failOnSeverity === 'none') {
    return false;
  }

  for (const v of report.vulnerabilities) {
    const vulnIndex = severityOrder.indexOf(v.severity);
    if (vulnIndex >= thresholdIndex) {
      return true;
    }
  }

  return false;
}

async function main(): Promise<void> {
  const config = loadConfig();

  // Parse CLI arguments
  const args = process.argv.slice(2);
  if (args.includes('--json')) {
    config.outputFormat = 'json';
  }
  if (args.includes('--markdown')) {
    config.outputFormat = 'markdown';
  }
  if (args.includes('--fail-on-high')) {
    config.failOnSeverity = 'high';
  }
  if (args.includes('--fail-on-critical')) {
    config.failOnSeverity = 'critical';
  }

  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    config.outputPath = args[outputIndex + 1];
  }

  // Run audits
  const vulnerabilities = filterVulnerabilities(runPnpmAudit(), config);
  const outdated = config.checkOutdated ? checkOutdated() : [];
  const duplicates = config.checkDuplicates ? findDuplicates() : [];
  const totalDependencies = countDependencies();

  // Build report
  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    totalDependencies,
    vulnerabilities,
    summary: {
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      moderate: vulnerabilities.filter(v => v.severity === 'moderate').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length,
      info: vulnerabilities.filter(v => v.severity === 'info').length,
      total: vulnerabilities.length,
    },
    outdated,
    duplicates,
  };

  // Output
  switch (config.outputFormat) {
    case 'json':
      const jsonOutput = JSON.stringify(report, null, 2);
      if (config.outputPath) {
        writeFileSync(config.outputPath, jsonOutput);
        console.log(`Report written to ${config.outputPath}`);
      } else {
        console.log(jsonOutput);
      }
      break;

    case 'markdown':
      const mdOutput = formatMarkdown(report);
      if (config.outputPath) {
        writeFileSync(config.outputPath, mdOutput);
        console.log(`Report written to ${config.outputPath}`);
      } else {
        console.log(mdOutput);
      }
      break;

    default:
      formatConsole(report);
  }

  // Exit with error if vulnerabilities exceed threshold
  if (shouldFail(report, config)) {
    console.error(`\n❌ Audit failed: Found vulnerabilities at or above ${config.failOnSeverity} severity`);
    process.exit(1);
  }

  console.log('\n✅ Audit passed');
}

main().catch(error => {
  console.error('Audit failed:', error);
  process.exit(1);
});
