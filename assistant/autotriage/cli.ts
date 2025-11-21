#!/usr/bin/env node
/**
 * Autotriage CLI
 *
 * Main entry point for the autotriage engine
 * Usage: node assistant/autotriage/cli.ts [command] [options]
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseBacklog } from './data/backlog-parser.js';
import { parseBugBash } from './data/bugbash-parser.js';
import { fetchGitHubIssuesFromEnv } from './data/github-fetcher.js';
import { detectAreas } from './classifier/area-detector.js';
import { analyzeImpact } from './classifier/impact-analyzer.js';
import { classifyType } from './classifier/type-classifier.js';
import { clusterIssues } from './classifier/issue-clusterer.js';
import { generateTriageReport, formatReportAsMarkdown, formatReportAsJSON } from './reports/triage-report.js';
import { generateBatchLabels, suggestImprovedTitle } from './automation/label-generator.js';
import { draftBatchComments, draftAutoTriageComment } from './automation/comment-drafter.js';
import { defaultConfig } from './config.js';
import { TriageItem } from './types.js';

interface CLIOptions {
  command: string;
  includeGithub: boolean;
  outputFormat: 'markdown' | 'json';
  outputFile?: string;
  generateLabels: boolean;
  generateComments: boolean;
  verbose: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.verbose) {
    console.log('🤖 Autotriage Engine v1.0');
    console.log('');
  }

  switch (options.command) {
    case 'triage':
    case 'backlog':
      await runTriage(options);
      break;
    case 'labels':
      await runLabelGeneration(options);
      break;
    case 'comments':
      await runCommentGeneration(options);
      break;
    case 'help':
    default:
      printHelp();
      break;
  }
}

async function runTriage(options: CLIOptions) {
  console.log('📊 Running triage analysis...\n');

  // Step 1: Collect data from all sources
  console.log('📥 Collecting data from sources...');
  const items: TriageItem[] = [];

  // Parse backlog
  try {
    const backlogItems = await parseBacklog();
    items.push(...backlogItems);
    console.log(`  ✓ Backlog: ${backlogItems.length} items`);
  } catch (error) {
    console.warn(`  ⚠ Backlog parsing failed: ${error}`);
  }

  // Parse bug-bash
  try {
    const bugBashItems = await parseBugBash();
    items.push(...bugBashItems);
    console.log(`  ✓ Bug-bash: ${bugBashItems.length} items`);
  } catch (error) {
    console.warn(`  ⚠ Bug-bash parsing failed: ${error}`);
  }

  // Fetch GitHub issues (optional)
  if (options.includeGithub) {
    try {
      console.log('  ⏳ Fetching GitHub issues (this may take a moment)...');
      const githubItems = await fetchGitHubIssuesFromEnv();
      items.push(...githubItems);
      console.log(`  ✓ GitHub: ${githubItems.length} items`);
    } catch (error) {
      console.warn(`  ⚠ GitHub fetch failed: ${error}`);
    }
  }

  console.log(`\n📦 Total items collected: ${items.length}\n`);

  if (items.length === 0) {
    console.error('❌ No items to triage. Exiting.');
    process.exit(1);
  }

  // Step 2: Classify items
  console.log('🏷️  Classifying items...');
  const config = defaultConfig;

  items.forEach((item) => {
    // Detect areas
    if (item.area.length === 0) {
      item.area = detectAreas(item, config.areas);
    }

    // Analyze impact
    const impactResult = analyzeImpact(item, config.impactRules);
    item.impact = impactResult.impact;
    item.impactScore = impactResult.score;

    // Classify type
    item.type = classifyType(item, config.typeRules);

    // Detect good first issues
    item.isGoodFirstIssue = item.complexityScore <= config.reporting.goodFirstIssueThreshold;
  });

  console.log('  ✓ Classification complete\n');

  // Step 3: Cluster similar issues
  console.log('🔗 Clustering similar issues...');
  const clusters = clusterIssues(items, config.clustering);
  console.log(`  ✓ Found ${clusters.length} clusters\n`);

  // Assign cluster info to items
  clusters.forEach((cluster) => {
    cluster.items.forEach((item) => {
      item.clusterId = cluster.id;
      item.clusterTheme = cluster.theme;
    });
  });

  // Step 4: Generate report
  console.log('📝 Generating triage report...');
  const report = generateTriageReport(
    items,
    clusters,
    config.reporting.topIssuesCount,
    config.reporting.topThemesCount,
  );
  console.log('  ✓ Report generated\n');

  // Step 5: Output report
  const output =
    options.outputFormat === 'json'
      ? formatReportAsJSON(report)
      : formatReportAsMarkdown(report);

  if (options.outputFile) {
    const outputPath = path.resolve(options.outputFile);
    fs.writeFileSync(outputPath, output, 'utf8');
    console.log(`✅ Report saved to: ${outputPath}\n`);
  } else {
    console.log('---\n');
    console.log(output);
    console.log('\n---\n');
  }

  // Step 6: Generate labels (optional)
  if (options.generateLabels) {
    console.log('🏷️  Generating label suggestions...');
    const labelSuggestions = generateBatchLabels(items);
    const labelsPath = path.resolve('triage-labels.json');
    fs.writeFileSync(labelsPath, JSON.stringify(labelSuggestions, null, 2), 'utf8');
    console.log(`  ✓ Label suggestions saved to: ${labelsPath}\n`);
  }

  // Step 7: Generate comments (optional)
  if (options.generateComments) {
    console.log('💬 Generating comment drafts...');
    const commentDrafts = draftBatchComments(items, clusters);
    const commentsPath = path.resolve('triage-comments.json');
    fs.writeFileSync(commentsPath, JSON.stringify(commentDrafts, null, 2), 'utf8');
    console.log(`  ✓ Comment drafts saved to: ${commentsPath}\n`);
  }

  console.log('✨ Triage complete!\n');
}

async function runLabelGeneration(options: CLIOptions) {
  console.log('🏷️  Generating labels only...\n');
  // Reuse triage logic but only output labels
  await runTriage({ ...options, generateLabels: true, generateComments: false });
}

async function runCommentGeneration(options: CLIOptions) {
  console.log('💬 Generating comments only...\n');
  // Reuse triage logic but only output comments
  await runTriage({ ...options, generateLabels: false, generateComments: true });
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    command: args[0] || 'help',
    includeGithub: false,
    outputFormat: 'markdown',
    outputFile: undefined,
    generateLabels: false,
    generateComments: false,
    verbose: true,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--github':
      case '-g':
        options.includeGithub = true;
        break;
      case '--json':
      case '-j':
        options.outputFormat = 'json';
        break;
      case '--output':
      case '-o':
        options.outputFile = args[++i];
        break;
      case '--labels':
      case '-l':
        options.generateLabels = true;
        break;
      case '--comments':
      case '-c':
        options.generateComments = true;
        break;
      case '--quiet':
      case '-q':
        options.verbose = false;
        break;
      case '--all':
      case '-a':
        options.generateLabels = true;
        options.generateComments = true;
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
🤖 Autotriage Engine - Automated Issue Triage for Summit

USAGE:
  assistant triage [backlog] [options]

COMMANDS:
  triage, backlog   Run full triage analysis (default)
  labels            Generate label suggestions only
  comments          Generate comment drafts only
  help              Show this help message

OPTIONS:
  -g, --github      Include GitHub issues (requires GITHUB_TOKEN env var)
  -j, --json        Output in JSON format (default: markdown)
  -o, --output      Output file path (default: stdout)
  -l, --labels      Generate label suggestions file
  -c, --comments    Generate comment draft file
  -a, --all         Generate all outputs (labels + comments)
  -q, --quiet       Quiet mode (minimal output)

EXAMPLES:
  # Basic triage of backlog and bug-bash
  assistant triage backlog

  # Include GitHub issues
  assistant triage backlog --github

  # Save report to file
  assistant triage backlog --output triage-report.md

  # Generate everything (report + labels + comments)
  assistant triage backlog --all --output report.md

  # JSON output for processing
  assistant triage backlog --json --output report.json

ENVIRONMENT VARIABLES:
  GITHUB_TOKEN      GitHub personal access token (for --github)
  GITHUB_OWNER      GitHub owner/org (default: BrianCLong)
  GITHUB_REPO       GitHub repo name (default: summit)

OUTPUT:
  The triage report includes:
  - Summary statistics by source, area, impact, and type
  - Top 10 blocking themes (clustered issues)
  - Top priority issues
  - Good first issues for new contributors
  - Actionable recommendations

For more information, see: assistant/autotriage/README.md
`);
}

// Run CLI
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
