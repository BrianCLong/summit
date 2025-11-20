#!/usr/bin/env node
/**
 * Benchmark Report Generator
 * Generates HTML and Markdown reports from benchmark results
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadLatestResults() {
  const reportsDir = path.join(__dirname, '..', 'reports');
  const latestPath = path.join(reportsDir, 'latest.json');

  if (!fs.existsSync(latestPath)) {
    console.error('No benchmark results found. Run benchmarks first: npm run bench:quick');
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(latestPath, 'utf8'));
}

function loadBudgets() {
  const budgetsPath = path.join(__dirname, '..', 'config', 'budgets.json');
  return JSON.parse(fs.readFileSync(budgetsPath, 'utf8'));
}

function generateMarkdownReport(results, budgets) {
  let md = '# Graph Benchmark Report\n\n';
  md += `**Generated:** ${results.metadata.timestamp}\n\n`;
  md += '## Configuration\n\n';
  md += `- Dataset Sizes: ${results.metadata.config.sizes.join(', ')}\n`;
  md += `- Scenario Mode: ${results.metadata.config.scenarios}\n`;
  md += `- Iterations: ${results.metadata.config.iterations}\n`;
  md += `- Warmup: ${results.metadata.config.warmup}\n\n`;

  md += '## Environment\n\n';
  md += `- Neo4j URI: ${results.metadata.environment.neo4jUri}\n`;
  md += `- Node Version: ${results.metadata.environment.nodeVersion}\n`;
  md += `- Platform: ${results.metadata.environment.platform}\n\n`;

  // Results by dataset size
  for (const benchmark of results.benchmarks) {
    md += `## Dataset: ${benchmark.size}\n\n`;
    md += `- Nodes: ${benchmark.dataset.nodeCount}\n`;
    md += `- Edges: ${benchmark.dataset.edgeCount}\n`;
    md += `- Avg Degree: ${benchmark.dataset.avgDegree.toFixed(2)}\n\n`;

    for (const scenario of benchmark.scenarios) {
      md += `### ${scenario.description}\n\n`;
      md += '| Query | p50 (ms) | p95 (ms) | p99 (ms) | Min (ms) | Max (ms) | Mean (ms) | Errors | Status |\n';
      md += '|-------|----------|----------|----------|----------|----------|-----------|--------|---------|\n';

      for (const query of scenario.queries) {
        const budget = budgets.budgets[query.name];
        let status = '✅';

        if (budget) {
          if (query.p95 > budget.thresholds.p95) {
            status = budget.critical ? '❌' : '⚠️';
          }
        }

        md += `| ${query.name} | ${query.p50.toFixed(2)} | ${query.p95.toFixed(2)} | ${query.p99.toFixed(2)} | ${query.min.toFixed(2)} | ${query.max.toFixed(2)} | ${query.mean.toFixed(2)} | ${query.errorCount} | ${status} |\n`;
      }

      md += '\n';
    }
  }

  // Budget violations
  if (results.budgetCheck) {
    md += '## Performance Budget Check\n\n';
    if (results.budgetCheck.passed) {
      md += '✅ **All queries within performance budgets**\n\n';
    } else {
      md += `❌ **Budget check failed: ${results.budgetCheck.violations.length} violations**\n\n`;
      md += '| Dataset | Query | Metric | Actual (ms) | Budget (ms) | Exceeded By |\n';
      md += '|---------|-------|--------|-------------|-------------|-------------|\n';

      for (const violation of results.budgetCheck.violations) {
        const exceededBy = ((violation.actual / violation.threshold - 1) * 100).toFixed(1);
        md += `| ${violation.size} | ${violation.query} | ${violation.metric} | ${violation.actual.toFixed(2)} | ${violation.threshold} | +${exceededBy}% |\n`;
      }

      md += '\n';
    }
  }

  // Performance budgets reference
  md += '## Performance Budgets Reference\n\n';
  md += '| Query | p50 Budget | p95 Budget | p99 Budget | Critical |\n';
  md += '|-------|------------|------------|------------|----------|\n';

  for (const [key, budget] of Object.entries(budgets.budgets)) {
    md += `| ${key} | ${budget.thresholds.p50}ms | ${budget.thresholds.p95}ms | ${budget.thresholds.p99}ms | ${budget.critical ? '✓' : ''} |\n`;
  }

  md += '\n';

  // Summary statistics
  md += '## Summary\n\n';
  md += 'Query latencies across all dataset sizes:\n\n';

  // Collect all queries
  const queryStats = {};
  for (const benchmark of results.benchmarks) {
    for (const scenario of benchmark.scenarios) {
      for (const query of scenario.queries) {
        if (!queryStats[query.name]) {
          queryStats[query.name] = { sizes: [], p95s: [] };
        }
        queryStats[query.name].sizes.push(benchmark.size);
        queryStats[query.name].p95s.push(query.p95);
      }
    }
  }

  md += '| Query | Dataset Sizes | p95 Latencies (ms) |\n';
  md += '|-------|---------------|--------------------|\n';

  for (const [queryName, stats] of Object.entries(queryStats)) {
    const sizes = stats.sizes.join(', ');
    const p95s = stats.p95s.map(p => p.toFixed(1)).join(', ');
    md += `| ${queryName} | ${sizes} | ${p95s} |\n`;
  }

  md += '\n';

  return md;
}

function generateHTMLReport(results, budgets) {
  const mdReport = generateMarkdownReport(results, budgets);

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Graph Benchmark Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
      border-bottom: 2px solid #ecf0f1;
      padding-bottom: 8px;
    }
    h3 {
      color: #7f8c8d;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 14px;
    }
    th {
      background: #3498db;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #ecf0f1;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .status-pass { color: #27ae60; font-weight: bold; }
    .status-warn { color: #f39c12; font-weight: bold; }
    .status-fail { color: #e74c3c; font-weight: bold; }
    .metric-box {
      display: inline-block;
      padding: 4px 8px;
      margin: 2px;
      background: #ecf0f1;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
    }
    .critical {
      background: #fee;
      border-left: 4px solid #e74c3c;
      padding: 10px;
      margin: 10px 0;
    }
    .info {
      background: #e8f4f8;
      border-left: 4px solid #3498db;
      padding: 10px;
      margin: 10px 0;
    }
    ul {
      line-height: 1.8;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
  </style>
</head>
<body>
  <div class="container">
`;

  // Parse markdown sections and convert to HTML
  const sections = mdReport.split('\n## ');
  html += `<h1>${sections[0].replace('# ', '').split('\n')[0]}</h1>\n`;

  // Configuration info
  html += '<div class="info">\n';
  const configLines = mdReport.match(/\*\*Generated:\*\* .+\n([\s\S]+?)(?=\n## )/);
  if (configLines) {
    html += configLines[0].replace(/\*\*(.+?):\*\*/g, '<strong>$1:</strong>').replace(/\n/g, '<br>\n');
  }
  html += '</div>\n';

  // Convert tables
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    html += `<h2>${lines[0]}</h2>\n`;

    let inTable = false;
    for (let j = 1; j < lines.length; j++) {
      const line = lines[j];

      if (line.startsWith('|')) {
        if (!inTable) {
          html += '<table>\n';
          inTable = true;

          // Header row
          const headers = line.split('|').filter(h => h.trim());
          html += '<tr>';
          headers.forEach(h => html += `<th>${h.trim()}</th>`);
          html += '</tr>\n';
          j++; // Skip separator line
        } else {
          // Data row
          const cells = line.split('|').filter(c => c.trim());
          html += '<tr>';
          cells.forEach(c => {
            let cellClass = '';
            if (c.includes('✅')) cellClass = 'status-pass';
            else if (c.includes('⚠️')) cellClass = 'status-warn';
            else if (c.includes('❌')) cellClass = 'status-fail';

            html += `<td class="${cellClass}">${c.trim()}</td>`;
          });
          html += '</tr>\n';
        }
      } else {
        if (inTable) {
          html += '</table>\n';
          inTable = false;
        }

        if (line.startsWith('###')) {
          html += `<h3>${line.replace('### ', '')}</h3>\n`;
        } else if (line.startsWith('- ')) {
          html += `<ul><li>${line.replace('- ', '')}</li></ul>\n`;
        } else if (line.trim().startsWith('✅') || line.trim().startsWith('❌')) {
          const cssClass = line.includes('✅') ? 'info' : 'critical';
          html += `<div class="${cssClass}">${line}</div>\n`;
        } else if (line.trim()) {
          html += `<p>${line}</p>\n`;
        }
      }
    }

    if (inTable) {
      html += '</table>\n';
    }
  }

  html += `
  </div>
</body>
</html>
`;

  return html;
}

function main() {
  console.log('Loading benchmark results...');
  const results = loadLatestResults();
  const budgets = loadBudgets();

  const reportsDir = path.join(__dirname, '..', 'reports');

  // Generate Markdown report
  console.log('Generating Markdown report...');
  const mdReport = generateMarkdownReport(results, budgets);
  const mdPath = path.join(reportsDir, 'report.md');
  fs.writeFileSync(mdPath, mdReport);
  console.log(`✅ Markdown report saved: ${mdPath}`);

  // Generate HTML report
  console.log('Generating HTML report...');
  const htmlReport = generateHTMLReport(results, budgets);
  const htmlPath = path.join(reportsDir, 'report.html');
  fs.writeFileSync(htmlPath, htmlReport);
  console.log(`✅ HTML report saved: ${htmlPath}`);

  console.log('\n📊 Reports generated successfully!');
  console.log(`\nView reports:`);
  console.log(`  Markdown: ${mdPath}`);
  console.log(`  HTML: file://${htmlPath}`);
}

main();
