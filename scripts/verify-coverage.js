#!/usr/bin/env node
/**
 * Test Coverage Verification Script
 *
 * Enforces minimum test coverage thresholds across the codebase
 * Supports multiple coverage formats and provides detailed reporting
 *
 * Usage: node scripts/verify-coverage.js [threshold] [--format=format]
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_THRESHOLD = 80;
const COVERAGE_FORMATS = ['json-summary', 'lcov', 'clover'];

function findCoverageFiles() {
  const possiblePaths = [
    'coverage/coverage-summary.json',
    'coverage/lcov-report/coverage-summary.json',
    'server/coverage/coverage-summary.json',
    'client/coverage/coverage-summary.json',
    'coverage.json',
  ];

  const foundFiles = [];
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      foundFiles.push(filePath);
    }
  }

  return foundFiles;
}

function parseCoverageSummary(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Handle different coverage summary formats
    if (data.total) {
      return {
        lines: data.total.lines,
        statements: data.total.statements,
        functions: data.total.functions,
        branches: data.total.branches,
      };
    } else {
      // Handle other formats
      return data;
    }
  } catch (error) {
    console.error(`❌ Error reading coverage file ${filePath}:`, error.message);
    return null;
  }
}

function calculateOverallCoverage(coverageFiles) {
  let totalLines = 0;
  let totalCoveredLines = 0;
  let totalStatements = 0;
  let totalCoveredStatements = 0;
  let totalFunctions = 0;
  let totalCoveredFunctions = 0;
  let totalBranches = 0;
  let totalCoveredBranches = 0;

  const componentCoverage = [];

  for (const file of coverageFiles) {
    const coverage = parseCoverageSummary(file);
    if (!coverage) continue;

    const component = path.dirname(file).split('/')[0] || 'root';

    if (coverage.lines) {
      totalLines += coverage.lines.total || 0;
      totalCoveredLines += coverage.lines.covered || 0;
    }

    if (coverage.statements) {
      totalStatements += coverage.statements.total || 0;
      totalCoveredStatements += coverage.statements.covered || 0;
    }

    if (coverage.functions) {
      totalFunctions += coverage.functions.total || 0;
      totalCoveredFunctions += coverage.functions.covered || 0;
    }

    if (coverage.branches) {
      totalBranches += coverage.branches.total || 0;
      totalCoveredBranches += coverage.branches.covered || 0;
    }

    componentCoverage.push({
      component,
      file,
      lines: coverage.lines ? coverage.lines.pct : 0,
      statements: coverage.statements ? coverage.statements.pct : 0,
      functions: coverage.functions ? coverage.functions.pct : 0,
      branches: coverage.branches ? coverage.branches.pct : 0,
    });
  }

  return {
    overall: {
      lines: totalLines > 0 ? (totalCoveredLines / totalLines) * 100 : 0,
      statements:
        totalStatements > 0
          ? (totalCoveredStatements / totalStatements) * 100
          : 0,
      functions:
        totalFunctions > 0 ? (totalCoveredFunctions / totalFunctions) * 100 : 0,
      branches:
        totalBranches > 0 ? (totalCoveredBranches / totalBranches) * 100 : 0,
    },
    components: componentCoverage,
  };
}

function generateCoverageReport(coverageData, threshold) {
  const { overall, components } = coverageData;

  console.log('\n📊 Test Coverage Report');
  console.log('========================');

  // Overall coverage
  console.log('\n🎯 Overall Coverage:');
  console.log(`   Lines:      ${overall.lines.toFixed(2)}%`);
  console.log(`   Statements: ${overall.statements.toFixed(2)}%`);
  console.log(`   Functions:  ${overall.functions.toFixed(2)}%`);
  console.log(`   Branches:   ${overall.branches.toFixed(2)}%`);

  // Component breakdown
  if (components.length > 1) {
    console.log('\n📦 Component Coverage:');
    components.forEach((comp) => {
      const status = comp.lines >= threshold ? '✅' : '❌';
      console.log(
        `   ${status} ${comp.component}: ${comp.lines.toFixed(1)}% lines`,
      );
    });
  }

  // Threshold check
  console.log(`\n🎯 Threshold: ${threshold}%`);
  const primaryMetric = overall.lines;

  if (primaryMetric >= threshold) {
    console.log(
      `✅ Coverage PASSED: ${primaryMetric.toFixed(2)}% >= ${threshold}%`,
    );
    return true;
  } else {
    console.log(
      `❌ Coverage FAILED: ${primaryMetric.toFixed(2)}% < ${threshold}%`,
    );

    // Provide actionable feedback
    const deficit = threshold - primaryMetric;
    console.log(`\n💡 To reach ${threshold}% coverage:`);
    console.log(
      `   - Need to improve coverage by ${deficit.toFixed(2)} percentage points`,
    );
    console.log(`   - Focus on untested areas with high impact`);
    console.log(`   - Add tests for critical business logic first`);

    return false;
  }
}

function generateGitHubSummary(coverageData, threshold, passed) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) return;

  const { overall, components } = coverageData;

  const summary = `# 📊 Test Coverage Report

## Overall Coverage
| Metric | Percentage | Status |
|--------|------------|--------|
| Lines | ${overall.lines.toFixed(1)}% | ${overall.lines >= threshold ? '✅' : '❌'} |
| Statements | ${overall.statements.toFixed(1)}% | ${overall.statements >= threshold ? '✅' : '❌'} |
| Functions | ${overall.functions.toFixed(1)}% | ${overall.functions >= threshold ? '✅' : '❌'} |
| Branches | ${overall.branches.toFixed(1)}% | ${overall.branches >= threshold ? '✅' : '❌'} |

## Threshold Check
**Target**: ${threshold}%
**Result**: ${passed ? '✅ PASSED' : '❌ FAILED'}
**Primary Metric**: ${overall.lines.toFixed(2)}% lines

${
  components.length > 1
    ? `
## Component Breakdown
| Component | Lines | Status |
|-----------|-------|--------|
${components.map((c) => `| ${c.component} | ${c.lines.toFixed(1)}% | ${c.lines >= threshold ? '✅' : '❌'} |`).join('\n')}
`
    : ''
}

${
  !passed
    ? `
## 💡 Improvement Suggestions
- Increase coverage by ${(threshold - overall.lines).toFixed(1)} percentage points
- Focus on business logic and critical paths
- Add integration tests for API endpoints
- Consider property-based testing for complex algorithms
`
    : ''
}
`;

  try {
    fs.appendFileSync(summaryFile, summary);
  } catch (error) {
    console.error('Could not write to GitHub summary:', error.message);
  }
}

function main() {
  const args = process.argv.slice(2);
  const threshold = parseInt(args[0]) || DEFAULT_THRESHOLD;

  console.log(`🔍 Verifying test coverage (threshold: ${threshold}%)`);

  const coverageFiles = findCoverageFiles();

  if (coverageFiles.length === 0) {
    console.error('❌ No coverage files found');
    console.error('Expected locations:');
    console.error('  - coverage/coverage-summary.json');
    console.error('  - server/coverage/coverage-summary.json');
    console.error('  - client/coverage/coverage-summary.json');
    console.error('\nRun tests with coverage first: npm test -- --coverage');
    process.exit(1);
  }

  console.log(`📁 Found coverage files: ${coverageFiles.join(', ')}`);

  const coverageData = calculateOverallCoverage(coverageFiles);
  const passed = generateCoverageReport(coverageData, threshold);

  // Generate GitHub Actions summary if available
  generateGitHubSummary(coverageData, threshold, passed);

  if (passed) {
    console.log('\n🎉 Coverage verification passed!');
    process.exit(0);
  } else {
    console.log('\n💥 Coverage verification failed!');
    console.log('\nTo improve coverage:');
    console.log('1. Run: npm test -- --coverage');
    console.log('2. Open: coverage/lcov-report/index.html');
    console.log('3. Focus on red/yellow highlighted code');
    console.log('4. Add tests for uncovered critical paths');
    process.exit(1);
  }
}

// Handle various coverage formats
function detectCoverageFormat() {
  if (fs.existsSync('coverage/coverage-summary.json')) {
    return 'jest';
  }
  if (fs.existsSync('coverage/lcov.info')) {
    return 'lcov';
  }
  if (fs.existsSync('coverage.xml')) {
    return 'cobertura';
  }
  return 'unknown';
}

// Allow for different test runners
function getTestCommand() {
  const packageJson = path.join(process.cwd(), 'package.json');

  try {
    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));

    if (pkg.scripts && pkg.scripts['test:coverage']) {
      return 'npm run test:coverage';
    }
    if (pkg.scripts && pkg.scripts.test) {
      return 'npm test -- --coverage';
    }
    if (pkg.devDependencies && pkg.devDependencies.jest) {
      return 'npx jest --coverage';
    }
  } catch (error) {
    // Ignore errors, fall back to default
  }

  return 'npm test -- --coverage';
}

if (require.main === module) {
  main();
}

module.exports = {
  findCoverageFiles,
  parseCoverageSummary,
  calculateOverallCoverage,
  generateCoverageReport,
  DEFAULT_THRESHOLD,
};
