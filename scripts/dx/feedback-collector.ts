#!/usr/bin/env npx tsx
/**
 * P41: Developer Experience Feedback Collector
 * Collects and analyzes DX metrics from the development workflow
 */

import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '../..');
const OUTPUT_DIR = join(ROOT_DIR, '.dx-metrics');

interface DXMetrics {
  timestamp: string;
  buildMetrics: BuildMetrics;
  testMetrics: TestMetrics;
  ciMetrics: CIMetrics;
  codebaseMetrics: CodebaseMetrics;
  devEnvMetrics: DevEnvMetrics;
}

interface BuildMetrics {
  coldBuildTime: number;
  warmBuildTime: number;
  incrementalBuildTime: number;
  bundleSize: number;
  dependencyCount: number;
  typeCheckTime: number;
  lintTime: number;
}

interface TestMetrics {
  totalTests: number;
  passingTests: number;
  failingTests: number;
  skippedTests: number;
  testRunTime: number;
  coverage: number;
}

interface CIMetrics {
  avgPipelineTime: number;
  successRate: number;
  flakyTestCount: number;
  cacheHitRate: number;
}

interface CodebaseMetrics {
  totalFiles: number;
  totalLines: number;
  avgFileSize: number;
  largestFiles: Array<{ path: string; lines: number }>;
  duplicateCodePercentage: number;
}

interface DevEnvMetrics {
  nodeVersion: string;
  pnpmVersion: string;
  dockerAvailable: boolean;
  memoryUsage: number;
  diskUsage: number;
}

function measureBuildTime(command: string): number {
  const start = Date.now();
  try {
    execSync(command, { cwd: ROOT_DIR, stdio: 'pipe' });
  } catch {
    // Build might fail, still record time
  }
  return Date.now() - start;
}

function getBuildMetrics(): BuildMetrics {
  console.log('Measuring build metrics...');

  // Type check time
  const typeCheckStart = Date.now();
  spawnSync('pnpm', ['typecheck'], { cwd: ROOT_DIR, stdio: 'pipe' });
  const typeCheckTime = Date.now() - typeCheckStart;

  // Lint time
  const lintStart = Date.now();
  spawnSync('pnpm', ['lint'], { cwd: ROOT_DIR, stdio: 'pipe' });
  const lintTime = Date.now() - lintStart;

  // Count dependencies
  let dependencyCount = 0;
  try {
    const result = spawnSync('pnpm', ['list', '--depth=0', '--json'], {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
    });
    const data = JSON.parse(result.stdout || '[]');
    for (const pkg of Array.isArray(data) ? data : [data]) {
      dependencyCount +=
        Object.keys(pkg.dependencies || {}).length +
        Object.keys(pkg.devDependencies || {}).length;
    }
  } catch {}

  return {
    coldBuildTime: 0, // Would need to clear cache to measure
    warmBuildTime: 0,
    incrementalBuildTime: 0,
    bundleSize: 0,
    dependencyCount,
    typeCheckTime,
    lintTime,
  };
}

function getTestMetrics(): TestMetrics {
  console.log('Measuring test metrics...');

  let totalTests = 0;
  let passingTests = 0;
  let failingTests = 0;
  let skippedTests = 0;
  let coverage = 0;

  const testStart = Date.now();
  try {
    const result = spawnSync('pnpm', ['test', '--', '--json', '--passWithNoTests'], {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      timeout: 300000,
    });

    // Parse Jest JSON output if available
    try {
      const jsonOutput = JSON.parse(result.stdout || '{}');
      totalTests = jsonOutput.numTotalTests || 0;
      passingTests = jsonOutput.numPassedTests || 0;
      failingTests = jsonOutput.numFailedTests || 0;
      skippedTests = jsonOutput.numPendingTests || 0;
    } catch {}
  } catch {}

  const testRunTime = Date.now() - testStart;

  return {
    totalTests,
    passingTests,
    failingTests,
    skippedTests,
    testRunTime,
    coverage,
  };
}

function getCIMetrics(): CIMetrics {
  // These would typically come from CI API
  return {
    avgPipelineTime: 0,
    successRate: 0,
    flakyTestCount: 0,
    cacheHitRate: 0,
  };
}

function getCodebaseMetrics(): CodebaseMetrics {
  console.log('Analyzing codebase metrics...');

  let totalFiles = 0;
  let totalLines = 0;
  const fileSizes: Array<{ path: string; lines: number }> = [];

  try {
    // Count TypeScript files
    const result = spawnSync(
      'find',
      ['.', '-name', '*.ts', '-o', '-name', '*.tsx', '-type', 'f'],
      { cwd: ROOT_DIR, encoding: 'utf-8' }
    );

    const files = (result.stdout || '')
      .split('\n')
      .filter((f) => f && !f.includes('node_modules') && !f.includes('dist'));

    totalFiles = files.length;

    for (const file of files.slice(0, 1000)) {
      try {
        const content = readFileSync(join(ROOT_DIR, file), 'utf-8');
        const lines = content.split('\n').length;
        totalLines += lines;
        fileSizes.push({ path: file, lines });
      } catch {}
    }
  } catch {}

  const largestFiles = fileSizes.sort((a, b) => b.lines - a.lines).slice(0, 10);

  return {
    totalFiles,
    totalLines,
    avgFileSize: totalFiles > 0 ? Math.round(totalLines / totalFiles) : 0,
    largestFiles,
    duplicateCodePercentage: 0, // Would need jscpd or similar
  };
}

function getDevEnvMetrics(): DevEnvMetrics {
  console.log('Collecting dev environment metrics...');

  let nodeVersion = '';
  let pnpmVersion = '';
  let dockerAvailable = false;

  try {
    nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
  } catch {}

  try {
    pnpmVersion = execSync('pnpm --version', { encoding: 'utf-8' }).trim();
  } catch {}

  try {
    execSync('docker --version', { stdio: 'pipe' });
    dockerAvailable = true;
  } catch {}

  const memoryUsage = process.memoryUsage().heapUsed;

  return {
    nodeVersion,
    pnpmVersion,
    dockerAvailable,
    memoryUsage,
    diskUsage: 0,
  };
}

function generateReport(metrics: DXMetrics): string {
  const lines: string[] = [
    '# Developer Experience Metrics Report',
    '',
    `Generated: ${metrics.timestamp}`,
    '',
    '## Build Performance',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Type Check Time | ${(metrics.buildMetrics.typeCheckTime / 1000).toFixed(2)}s |`,
    `| Lint Time | ${(metrics.buildMetrics.lintTime / 1000).toFixed(2)}s |`,
    `| Dependency Count | ${metrics.buildMetrics.dependencyCount} |`,
    '',
    '## Test Metrics',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Total Tests | ${metrics.testMetrics.totalTests} |`,
    `| Passing | ${metrics.testMetrics.passingTests} |`,
    `| Failing | ${metrics.testMetrics.failingTests} |`,
    `| Skipped | ${metrics.testMetrics.skippedTests} |`,
    `| Test Run Time | ${(metrics.testMetrics.testRunTime / 1000).toFixed(2)}s |`,
    '',
    '## Codebase Metrics',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Total Files | ${metrics.codebaseMetrics.totalFiles} |`,
    `| Total Lines | ${metrics.codebaseMetrics.totalLines.toLocaleString()} |`,
    `| Avg File Size | ${metrics.codebaseMetrics.avgFileSize} lines |`,
    '',
    '### Largest Files',
    '',
    '| File | Lines |',
    '|------|-------|',
  ];

  for (const file of metrics.codebaseMetrics.largestFiles) {
    lines.push(`| ${file.path} | ${file.lines} |`);
  }

  lines.push('');
  lines.push('## Development Environment');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Node.js | ${metrics.devEnvMetrics.nodeVersion} |`);
  lines.push(`| pnpm | ${metrics.devEnvMetrics.pnpmVersion} |`);
  lines.push(`| Docker | ${metrics.devEnvMetrics.dockerAvailable ? 'Available' : 'Not Available'} |`);
  lines.push('');

  return lines.join('\n');
}

async function main(): Promise<void> {
  console.log('========================================');
  console.log('     DX FEEDBACK COLLECTOR');
  console.log('========================================\n');

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const metrics: DXMetrics = {
    timestamp: new Date().toISOString(),
    buildMetrics: getBuildMetrics(),
    testMetrics: getTestMetrics(),
    ciMetrics: getCIMetrics(),
    codebaseMetrics: getCodebaseMetrics(),
    devEnvMetrics: getDevEnvMetrics(),
  };

  // Save JSON metrics
  const jsonPath = join(OUTPUT_DIR, 'dx-metrics.json');
  writeFileSync(jsonPath, JSON.stringify(metrics, null, 2));
  console.log(`\nJSON metrics saved to: ${jsonPath}`);

  // Generate and save report
  const report = generateReport(metrics);
  const reportPath = join(OUTPUT_DIR, 'dx-report.md');
  writeFileSync(reportPath, report);
  console.log(`Report saved to: ${reportPath}`);

  // Print summary
  console.log('\n--- Summary ---');
  console.log(`Total Files: ${metrics.codebaseMetrics.totalFiles}`);
  console.log(`Total Lines: ${metrics.codebaseMetrics.totalLines.toLocaleString()}`);
  console.log(`Dependencies: ${metrics.buildMetrics.dependencyCount}`);
  console.log(`Type Check: ${(metrics.buildMetrics.typeCheckTime / 1000).toFixed(2)}s`);

  console.log('\n========================================');
  console.log('✅ DX metrics collection complete');
  console.log('========================================');
}

main().catch((error) => {
  console.error('DX collection failed:', error);
  process.exit(1);
});
