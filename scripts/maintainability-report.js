#!/usr/bin/env node

/**
 * Maintainability Metrics Report Generator
 *
 * This script generates a comprehensive maintainability report for the codebase.
 * It analyzes complexity, file sizes, code duplication, and technical debt.
 *
 * Usage:
 *   node scripts/maintainability-report.js [--output=report.md] [--json]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  thresholds: {
    maxFileLines: 500,
    maxFunctionLines: 100,
    maxComplexity: 15,
    maxMethods: 20,
    maxImports: 20,
    minDuplicationLines: 10,
  },
  paths: {
    source: ['server/src', 'client/src', 'apps', 'packages', 'services'],
    exclude: ['node_modules', 'dist', 'build', 'coverage', '.turbo', 'archive'],
  },
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    return error.stdout || '';
  }
}

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

function analyzeFileSize() {
  log('\n📏 Analyzing File Sizes...', 'cyan');

  const results = {
    total: 0,
    bySize: { small: 0, medium: 0, large: 0, veryLarge: 0, extreme: 0 },
    largeFiles: [],
  };

  const findCommand = `find ${CONFIG.paths.source.join(' ')} -type f \\( -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \\) ${CONFIG.paths.exclude.map(e => `-not -path "*/${e}/*"`).join(' ')} 2>/dev/null`;

  const files = exec(findCommand).trim().split('\n').filter(Boolean);
  results.total = files.length;

  files.forEach((file) => {
    const lines = countLines(file);

    if (lines === 0) return;

    if (lines < 200) results.bySize.small++;
    else if (lines < 500) results.bySize.medium++;
    else if (lines < 1000) results.bySize.large++;
    else if (lines < 1500) results.bySize.veryLarge++;
    else results.bySize.extreme++;

    if (lines > CONFIG.thresholds.maxFileLines) {
      results.largeFiles.push({ file, lines });
    }
  });

  results.largeFiles.sort((a, b) => b.lines - a.lines);

  return results;
}

function analyzeTechnicalDebt() {
  log('\n💳 Analyzing Technical Debt...', 'cyan');

  const results = {
    todo: [],
    fixme: [],
    hack: [],
    xxx: [],
    total: 0,
  };

  const patterns = ['TODO', 'FIXME', 'HACK', 'XXX'];

  patterns.forEach((pattern) => {
    const grepCommand = `grep -rn "${pattern}" ${CONFIG.paths.source.join(' ')} --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" ${CONFIG.paths.exclude.map(e => `--exclude-dir=${e}`).join(' ')} 2>/dev/null || true`;

    const output = exec(grepCommand);
    const matches = output.trim().split('\n').filter(Boolean);

    results[pattern.toLowerCase()] = matches.map((line) => {
      const [location, ...comment] = line.split(':');
      return { location, comment: comment.join(':').trim() };
    });
  });

  results.total =
    results.todo.length + results.fixme.length + results.hack.length + results.xxx.length;

  return results;
}

function analyzeCodeDuplication() {
  log('\n👯 Analyzing Code Duplication...', 'cyan');

  // Check if jscpd is installed
  try {
    exec('which jscpd');
  } catch {
    log('⚠️  jscpd not installed. Skipping duplication analysis.', 'yellow');
    return { available: false };
  }

  const jscpdCommand = `jscpd ${CONFIG.paths.source.join(' ')} --min-lines ${CONFIG.thresholds.minDuplicationLines} --format "javascript,typescript" --reporters "json" --output "./.jscpd-temp" --ignore "**/*.test.*,**/*.spec.*,${CONFIG.paths.exclude.map(e => `**/${e}/**`).join(',')}" 2>/dev/null || true`;

  exec(jscpdCommand);

  let duplicationData = { available: true, percentage: 0, duplicates: [] };

  try {
    const reportPath = './.jscpd-temp/jscpd-report.json';
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      duplicationData.percentage = report.statistics?.total?.percentage || 0;
      duplicationData.duplicates = report.duplicates || [];
    }

    // Cleanup temp files
    exec('rm -rf ./.jscpd-temp 2>/dev/null || true');
  } catch (error) {
    log(`⚠️  Error parsing duplication report: ${error.message}`, 'yellow');
  }

  return duplicationData;
}

function analyzeLinesOfCode() {
  log('\n📊 Analyzing Lines of Code...', 'cyan');

  // Check if cloc is installed
  try {
    exec('which cloc');
  } catch {
    log('⚠️  cloc not installed. Skipping LOC analysis.', 'yellow');
    return { available: false };
  }

  const clocCommand = `cloc ${CONFIG.paths.source.join(' ')} --json ${CONFIG.paths.exclude.map(e => `--exclude-dir=${e}`).join(' ')} 2>/dev/null`;

  const output = exec(clocCommand);

  try {
    const data = JSON.parse(output);
    return {
      available: true,
      total: data.SUM?.code || 0,
      byLanguage: {
        TypeScript: data.TypeScript?.code || 0,
        JavaScript: data.JavaScript?.code || 0,
        JSX: data.JSX?.code || 0,
        TSX: data.TSX?.code || 0,
      },
      comments: data.SUM?.comment || 0,
      blanks: data.SUM?.blank || 0,
    };
  } catch {
    return { available: false };
  }
}

function generateMarkdownReport(data) {
  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0];

  let md = `# Maintainability Metrics Report\n\n`;
  md += `**Generated:** ${timestamp}\n\n`;
  md += `**Repository:** IntelGraph Platform\n\n`;
  md += `---\n\n`;

  // Executive Summary
  md += `## 📈 Executive Summary\n\n`;
  md += `| Metric | Value | Status |\n`;
  md += `|--------|-------|--------|\n`;

  const fileStatus =
    data.fileSize.largeFiles.length === 0
      ? '✅ Good'
      : data.fileSize.largeFiles.length < 50
        ? '⚠️ Warning'
        : '❌ Critical';

  const debtStatus =
    data.debt.total < 50
      ? '✅ Good'
      : data.debt.total < 150
        ? '⚠️ Warning'
        : '❌ High';

  const dupStatus = data.duplication.available
    ? data.duplication.percentage < 3
      ? '✅ Good'
      : data.duplication.percentage < 5
        ? '⚠️ Warning'
        : '❌ High'
    : 'N/A';

  md += `| Total Files | ${data.fileSize.total} | ℹ️ Info |\n`;
  md += `| Files > ${CONFIG.thresholds.maxFileLines} lines | ${data.fileSize.largeFiles.length} | ${fileStatus} |\n`;
  md += `| Technical Debt Markers | ${data.debt.total} | ${debtStatus} |\n`;

  if (data.duplication.available) {
    md += `| Code Duplication | ${data.duplication.percentage.toFixed(2)}% | ${dupStatus} |\n`;
  }

  if (data.loc.available) {
    md += `| Total Lines of Code | ${data.loc.total.toLocaleString()} | ℹ️ Info |\n`;
  }

  md += `\n---\n\n`;

  // File Size Analysis
  md += `## 📏 File Size Distribution\n\n`;
  md += `| Size Category | Count | Percentage |\n`;
  md += `|---------------|-------|------------|\n`;
  md += `| 0-200 lines (Small) | ${data.fileSize.bySize.small} | ${((data.fileSize.bySize.small / data.fileSize.total) * 100).toFixed(1)}% |\n`;
  md += `| 201-500 lines (Medium) | ${data.fileSize.bySize.medium} | ${((data.fileSize.bySize.medium / data.fileSize.total) * 100).toFixed(1)}% |\n`;
  md += `| 501-1000 lines (Large) | ${data.fileSize.bySize.large} | ${((data.fileSize.bySize.large / data.fileSize.total) * 100).toFixed(1)}% |\n`;
  md += `| 1001-1500 lines (Very Large) | ${data.fileSize.bySize.veryLarge} | ${((data.fileSize.bySize.veryLarge / data.fileSize.total) * 100).toFixed(1)}% |\n`;
  md += `| 1500+ lines (Extreme) | ${data.fileSize.bySize.extreme} | ${((data.fileSize.bySize.extreme / data.fileSize.total) * 100).toFixed(1)}% |\n`;

  if (data.fileSize.largeFiles.length > 0) {
    md += `\n### 🚨 Top 20 Largest Files (> ${CONFIG.thresholds.maxFileLines} lines)\n\n`;
    md += `| File | Lines |\n`;
    md += `|------|-------|\n`;
    data.fileSize.largeFiles.slice(0, 20).forEach(({ file, lines }) => {
      const relativePath = file.replace(/^\.\//, '');
      md += `| \`${relativePath}\` | ${lines} |\n`;
    });
  }

  md += `\n---\n\n`;

  // Technical Debt
  md += `## 💳 Technical Debt Analysis\n\n`;
  md += `| Debt Type | Count |\n`;
  md += `|-----------|-------|\n`;
  md += `| TODO | ${data.debt.todo.length} |\n`;
  md += `| FIXME | ${data.debt.fixme.length} |\n`;
  md += `| HACK | ${data.debt.hack.length} |\n`;
  md += `| XXX | ${data.debt.xxx.length} |\n`;
  md += `| **Total** | **${data.debt.total}** |\n`;

  if (data.debt.total > 0) {
    md += `\n### 📋 Sample Technical Debt Items\n\n`;
    const samples = [...data.debt.todo, ...data.debt.fixme].slice(0, 10);
    samples.forEach(({ location, comment }) => {
      md += `- \`${location}\`: ${comment}\n`;
    });
  }

  md += `\n---\n\n`;

  // Code Duplication
  if (data.duplication.available) {
    md += `## 👯 Code Duplication\n\n`;
    md += `**Duplication Percentage:** ${data.duplication.percentage.toFixed(2)}%\n\n`;
    md += `**Threshold:** < 5% is acceptable, < 3% is good\n\n`;

    if (data.duplication.duplicates.length > 0) {
      md += `**Found ${data.duplication.duplicates.length} duplicate code blocks**\n\n`;
    }
  }

  // Lines of Code
  if (data.loc.available) {
    md += `---\n\n`;
    md += `## 📊 Lines of Code\n\n`;
    md += `| Language | Lines |\n`;
    md += `|----------|-------|\n`;
    Object.entries(data.loc.byLanguage).forEach(([lang, lines]) => {
      if (lines > 0) {
        md += `| ${lang} | ${lines.toLocaleString()} |\n`;
      }
    });
    md += `| **Total** | **${data.loc.total.toLocaleString()}** |\n`;
    md += `\n`;
    md += `- **Comments:** ${data.loc.comments.toLocaleString()} lines\n`;
    md += `- **Blank Lines:** ${data.loc.blanks.toLocaleString()} lines\n`;
  }

  md += `\n---\n\n`;

  // Recommendations
  md += `## 🎯 Recommendations\n\n`;
  md += `### Priority 1: Critical Issues\n\n`;

  if (data.fileSize.bySize.extreme > 0) {
    md += `1. **Refactor ${data.fileSize.bySize.extreme} extreme files (>1500 lines)**\n`;
    md += `   - Break down into smaller, focused modules\n`;
    md += `   - Extract utilities and helpers\n`;
    md += `   - Apply Single Responsibility Principle\n\n`;
  }

  md += `### Priority 2: High Impact\n\n`;

  if (data.fileSize.bySize.veryLarge > 0) {
    md += `2. **Refactor ${data.fileSize.bySize.veryLarge} very large files (1001-1500 lines)**\n`;
    md += `   - Identify logical boundaries for splitting\n`;
    md += `   - Extract reusable components/functions\n\n`;
  }

  if (data.debt.fixme.length > 0) {
    md += `3. **Address ${data.debt.fixme.length} FIXME comments**\n`;
    md += `   - These indicate known issues that need resolution\n`;
    md += `   - Prioritize by criticality and impact\n\n`;
  }

  md += `### Priority 3: Medium Impact\n\n`;

  if (data.fileSize.bySize.large > 50) {
    md += `4. **Refactor ${data.fileSize.bySize.large} large files (501-1000 lines)**\n`;
    md += `   - Focus on the largest first\n`;
    md += `   - Set a goal to reduce by 20% per quarter\n\n`;
  }

  if (data.duplication.available && data.duplication.percentage > 5) {
    md += `5. **Reduce code duplication from ${data.duplication.percentage.toFixed(2)}% to < 5%**\n`;
    md += `   - Extract common patterns into shared utilities\n`;
    md += `   - Create reusable components\n`;
    md += `   - Apply DRY principle\n\n`;
  }

  if (data.debt.todo.length > 50) {
    md += `6. **Address ${data.debt.todo.length} TODO comments**\n`;
    md += `   - Convert to tracked issues\n`;
    md += `   - Remove obsolete TODOs\n`;
    md += `   - Complete or remove TODOs systematically\n\n`;
  }

  md += `---\n\n`;

  // Thresholds Reference
  md += `## 📋 Metrics Thresholds Reference\n\n`;
  md += `| Metric | Threshold | Current Status |\n`;
  md += `|--------|-----------|----------------|\n`;
  md += `| Max File Lines | ${CONFIG.thresholds.maxFileLines} | ${data.fileSize.largeFiles.length} violations |\n`;
  md += `| Max Function Lines | ${CONFIG.thresholds.maxFunctionLines} | See ESLint report |\n`;
  md += `| Max Cyclomatic Complexity | ${CONFIG.thresholds.maxComplexity} | See ESLint report |\n`;
  md += `| Max Class Methods | ${CONFIG.thresholds.maxMethods} | See ESLint report |\n`;
  md += `| Max Imports | ${CONFIG.thresholds.maxImports} | See ESLint report |\n`;
  md += `| Code Duplication | < 5% | ${data.duplication.available ? data.duplication.percentage.toFixed(2) + '%' : 'N/A'} |\n`;

  md += `\n---\n\n`;
  md += `*Report generated by maintainability-report.js on ${date}*\n`;

  return md;
}

// Main execution
async function main() {
  log('\n🔍 IntelGraph Platform - Maintainability Metrics Report', 'bold');
  log('════════════════════════════════════════════════════════\n', 'bold');

  const data = {
    fileSize: analyzeFileSize(),
    debt: analyzeTechnicalDebt(),
    duplication: analyzeCodeDuplication(),
    loc: analyzeLinesOfCode(),
  };

  log('\n✅ Analysis Complete!', 'green');

  const report = generateMarkdownReport(data);

  // Parse command line arguments
  const args = process.argv.slice(2);
  const outputArg = args.find((arg) => arg.startsWith('--output='));
  const jsonFlag = args.includes('--json');

  const outputFile = outputArg ? outputArg.split('=')[1] : 'maintainability-report.md';

  // Write report
  fs.writeFileSync(outputFile, report, 'utf8');
  log(`\n📄 Report saved to: ${outputFile}`, 'cyan');

  // Write JSON data if requested
  if (jsonFlag) {
    const jsonFile = outputFile.replace('.md', '.json');
    fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2), 'utf8');
    log(`📄 JSON data saved to: ${jsonFile}`, 'cyan');
  }

  // Print summary to console
  log('\n📊 Summary:', 'bold');
  log(`   Total Files: ${data.fileSize.total}`, 'cyan');
  log(
    `   Files > ${CONFIG.thresholds.maxFileLines} lines: ${data.fileSize.largeFiles.length}`,
    data.fileSize.largeFiles.length > 50 ? 'red' : 'yellow'
  );
  log(
    `   Technical Debt Markers: ${data.debt.total}`,
    data.debt.total > 150 ? 'red' : 'yellow'
  );

  if (data.duplication.available) {
    log(
      `   Code Duplication: ${data.duplication.percentage.toFixed(2)}%`,
      data.duplication.percentage > 5 ? 'red' : 'green'
    );
  }

  log('\n');
}

main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});
