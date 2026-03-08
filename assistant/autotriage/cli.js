#!/usr/bin/env node
"use strict";
/**
 * Autotriage CLI
 *
 * Main entry point for the autotriage engine
 * Usage: node assistant/autotriage/cli.ts [command] [options]
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const backlog_parser_js_1 = require("./data/backlog-parser.js");
const bugbash_parser_js_1 = require("./data/bugbash-parser.js");
const github_fetcher_js_1 = require("./data/github-fetcher.js");
const area_detector_js_1 = require("./classifier/area-detector.js");
const impact_analyzer_js_1 = require("./classifier/impact-analyzer.js");
const type_classifier_js_1 = require("./classifier/type-classifier.js");
const issue_clusterer_js_1 = require("./classifier/issue-clusterer.js");
const triage_report_js_1 = require("./reports/triage-report.js");
const label_generator_js_1 = require("./automation/label-generator.js");
const comment_drafter_js_1 = require("./automation/comment-drafter.js");
const config_js_1 = require("./config.js");
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
async function runTriage(options) {
    console.log('📊 Running triage analysis...\n');
    // Step 1: Collect data from all sources
    console.log('📥 Collecting data from sources...');
    const items = [];
    // Parse backlog
    try {
        const backlogItems = await (0, backlog_parser_js_1.parseBacklog)();
        items.push(...backlogItems);
        console.log(`  ✓ Backlog: ${backlogItems.length} items`);
    }
    catch (error) {
        console.warn(`  ⚠ Backlog parsing failed: ${error}`);
    }
    // Parse bug-bash
    try {
        const bugBashItems = await (0, bugbash_parser_js_1.parseBugBash)();
        items.push(...bugBashItems);
        console.log(`  ✓ Bug-bash: ${bugBashItems.length} items`);
    }
    catch (error) {
        console.warn(`  ⚠ Bug-bash parsing failed: ${error}`);
    }
    // Fetch GitHub issues (optional)
    if (options.includeGithub) {
        try {
            console.log('  ⏳ Fetching GitHub issues (this may take a moment)...');
            const githubItems = await (0, github_fetcher_js_1.fetchGitHubIssuesFromEnv)();
            items.push(...githubItems);
            console.log(`  ✓ GitHub: ${githubItems.length} items`);
        }
        catch (error) {
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
    const config = config_js_1.defaultConfig;
    items.forEach((item) => {
        // Detect areas
        if (item.area.length === 0) {
            item.area = (0, area_detector_js_1.detectAreas)(item, config.areas);
        }
        // Analyze impact
        const impactResult = (0, impact_analyzer_js_1.analyzeImpact)(item, config.impactRules);
        item.impact = impactResult.impact;
        item.impactScore = impactResult.score;
        // Classify type
        item.type = (0, type_classifier_js_1.classifyType)(item, config.typeRules);
        // Detect good first issues
        item.isGoodFirstIssue = item.complexityScore <= config.reporting.goodFirstIssueThreshold;
    });
    console.log('  ✓ Classification complete\n');
    // Step 3: Cluster similar issues
    console.log('🔗 Clustering similar issues...');
    const clusters = (0, issue_clusterer_js_1.clusterIssues)(items, config.clustering);
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
    const report = (0, triage_report_js_1.generateTriageReport)(items, clusters, config.reporting.topIssuesCount, config.reporting.topThemesCount);
    console.log('  ✓ Report generated\n');
    // Step 5: Output report
    const output = options.outputFormat === 'json'
        ? (0, triage_report_js_1.formatReportAsJSON)(report)
        : (0, triage_report_js_1.formatReportAsMarkdown)(report);
    if (options.outputFile) {
        const outputPath = path.resolve(options.outputFile);
        fs.writeFileSync(outputPath, output, 'utf8');
        console.log(`✅ Report saved to: ${outputPath}\n`);
    }
    else {
        console.log('---\n');
        console.log(output);
        console.log('\n---\n');
    }
    // Step 6: Generate labels (optional)
    if (options.generateLabels) {
        console.log('🏷️  Generating label suggestions...');
        const labelSuggestions = (0, label_generator_js_1.generateBatchLabels)(items);
        const labelsPath = path.resolve('triage-labels.json');
        fs.writeFileSync(labelsPath, JSON.stringify(labelSuggestions, null, 2), 'utf8');
        console.log(`  ✓ Label suggestions saved to: ${labelsPath}\n`);
    }
    // Step 7: Generate comments (optional)
    if (options.generateComments) {
        console.log('💬 Generating comment drafts...');
        const commentDrafts = (0, comment_drafter_js_1.draftBatchComments)(items, clusters);
        const commentsPath = path.resolve('triage-comments.json');
        fs.writeFileSync(commentsPath, JSON.stringify(commentDrafts, null, 2), 'utf8');
        console.log(`  ✓ Comment drafts saved to: ${commentsPath}\n`);
    }
    console.log('✨ Triage complete!\n');
}
async function runLabelGeneration(options) {
    console.log('🏷️  Generating labels only...\n');
    // Reuse triage logic but only output labels
    await runTriage({ ...options, generateLabels: true, generateComments: false });
}
async function runCommentGeneration(options) {
    console.log('💬 Generating comments only...\n');
    // Reuse triage logic but only output comments
    await runTriage({ ...options, generateLabels: false, generateComments: true });
}
function parseArgs(args) {
    const options = {
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
