"use strict";
/**
 * Autotriage Usage Examples
 *
 * Demonstrates various ways to use the autotriage engine
 * programmatically in your own scripts and integrations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.example1_ParseBacklog = example1_ParseBacklog;
exports.example2_FullPipeline = example2_FullPipeline;
exports.example3_GitHubIntegration = example3_GitHubIntegration;
exports.example4_CustomConfig = example4_CustomConfig;
exports.example5_FilteringQueries = example5_FilteringQueries;
exports.example6_ToolIntegration = example6_ToolIntegration;
const backlog_parser_js_1 = require("../data/backlog-parser.js");
const bugbash_parser_js_1 = require("../data/bugbash-parser.js");
const github_fetcher_js_1 = require("../data/github-fetcher.js");
const area_detector_js_1 = require("../classifier/area-detector.js");
const impact_analyzer_js_1 = require("../classifier/impact-analyzer.js");
const type_classifier_js_1 = require("../classifier/type-classifier.js");
const issue_clusterer_js_1 = require("../classifier/issue-clusterer.js");
const triage_report_js_1 = require("../reports/triage-report.js");
const config_js_1 = require("../config.js");
/**
 * Example 1: Parse backlog only
 */
async function example1_ParseBacklog() {
    console.log('Example 1: Parse Backlog\n');
    const items = await (0, backlog_parser_js_1.parseBacklog)('./examples/sample-backlog.json');
    console.log(`Parsed ${items.length} backlog items`);
    items.forEach((item) => {
        console.log(`- [${item.id}] ${item.title} (${item.impact})`);
    });
}
/**
 * Example 2: Full triage pipeline with classification
 */
async function example2_FullPipeline() {
    console.log('\nExample 2: Full Triage Pipeline\n');
    // Step 1: Collect items from all sources
    const backlogItems = await (0, backlog_parser_js_1.parseBacklog)();
    const bugBashItems = await (0, bugbash_parser_js_1.parseBugBash)();
    const items = [...backlogItems, ...bugBashItems];
    console.log(`Collected ${items.length} items`);
    // Step 2: Classify each item
    items.forEach((item) => {
        // Detect areas
        if (item.area.length === 0) {
            item.area = (0, area_detector_js_1.detectAreas)(item, config_js_1.defaultConfig.areas);
        }
        // Analyze impact
        const impactResult = (0, impact_analyzer_js_1.analyzeImpact)(item, config_js_1.defaultConfig.impactRules);
        item.impact = impactResult.impact;
        item.impactScore = impactResult.score;
        // Classify type
        item.type = (0, type_classifier_js_1.classifyType)(item, config_js_1.defaultConfig.typeRules);
        // Determine if good first issue
        item.isGoodFirstIssue =
            item.complexityScore <= config_js_1.defaultConfig.reporting.goodFirstIssueThreshold;
    });
    console.log('Classification complete');
    // Step 3: Cluster similar issues
    const clusters = (0, issue_clusterer_js_1.clusterIssues)(items, config_js_1.defaultConfig.clustering);
    console.log(`Found ${clusters.length} clusters`);
    // Step 4: Generate report
    const report = (0, triage_report_js_1.generateTriageReport)(items, clusters, config_js_1.defaultConfig.reporting.topIssuesCount, config_js_1.defaultConfig.reporting.topThemesCount);
    const markdown = (0, triage_report_js_1.formatReportAsMarkdown)(report);
    console.log('\nGenerated report preview:');
    console.log(markdown.substring(0, 500) + '...');
    return report;
}
/**
 * Example 3: GitHub integration with error handling
 */
async function example3_GitHubIntegration() {
    console.log('\nExample 3: GitHub Integration\n');
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.warn('GITHUB_TOKEN not set. Using unauthenticated requests (rate limited).');
    }
    try {
        const items = await (0, github_fetcher_js_1.fetchGitHubIssues)({
            owner: 'BrianCLong',
            repo: 'summit',
            token,
            state: 'open',
            maxResults: 50,
        });
        console.log(`Fetched ${items.length} GitHub issues`);
        // Show breakdown
        const breakdown = {
            blocker: items.filter((i) => i.impact === 'blocker').length,
            high: items.filter((i) => i.impact === 'high').length,
            medium: items.filter((i) => i.impact === 'medium').length,
            low: items.filter((i) => i.impact === 'low').length,
        };
        console.log('Impact breakdown:', breakdown);
    }
    catch (error) {
        console.error('Error fetching GitHub issues:', error.message);
    }
}
/**
 * Example 4: Custom configuration
 */
async function example4_CustomConfig() {
    console.log('\nExample 4: Custom Configuration\n');
    // Create custom area configuration
    const customAreas = [
        ...config_js_1.defaultConfig.areas,
        {
            name: 'mobile',
            keywords: ['mobile', 'ios', 'android', 'app'],
            patterns: [/mobile/i, /\bios\b/i, /android/i],
            weight: 1.0,
        },
    ];
    // Parse and classify with custom config
    const items = await (0, backlog_parser_js_1.parseBacklog)('./examples/sample-backlog.json');
    items.forEach((item) => {
        item.area = (0, area_detector_js_1.detectAreas)(item, customAreas);
    });
    console.log('Classified with custom areas:');
    items.forEach((item) => {
        console.log(`- ${item.title}: [${item.area.join(', ')}]`);
    });
}
/**
 * Example 5: Filtering and querying
 */
async function example5_FilteringQueries() {
    console.log('\nExample 5: Filtering and Queries\n');
    const items = await (0, backlog_parser_js_1.parseBacklog)('./examples/sample-backlog.json');
    // Find all blocker items
    const blockers = items.filter((i) => i.impact === 'blocker');
    console.log(`\nBlockers (${blockers.length}):`);
    blockers.forEach((i) => console.log(`- ${i.title}`));
    // Find good first issues
    const goodFirst = items.filter((i) => i.isGoodFirstIssue);
    console.log(`\nGood First Issues (${goodFirst.length}):`);
    goodFirst.forEach((i) => console.log(`- ${i.title} (complexity: ${i.complexityScore})`));
    // Group by area
    const byArea = {};
    items.forEach((item) => {
        item.area.forEach((area) => {
            byArea[area] = (byArea[area] || 0) + 1;
        });
    });
    console.log('\nIssues by Area:');
    Object.entries(byArea)
        .sort((a, b) => b[1] - a[1])
        .forEach(([area, count]) => console.log(`- ${area}: ${count}`));
}
/**
 * Example 6: Integration with existing tools
 */
async function example6_ToolIntegration() {
    console.log('\nExample 6: Tool Integration\n');
    // This example shows how to integrate autotriage with other tools
    // For example, posting results to Slack or creating GitHub issues
    const items = await (0, backlog_parser_js_1.parseBacklog)('./examples/sample-backlog.json');
    const blockers = items.filter((i) => i.impact === 'blocker');
    // Example: Format for Slack notification
    const slackMessage = {
        text: '🚨 Triage Alert: New Blockers Detected',
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `Found ${blockers.length} blocker issue(s) requiring immediate attention:`,
                },
            },
            ...blockers.map((item) => ({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `• *${item.title}*\n  ID: ${item.id} | Areas: ${item.area.join(', ')}`,
                },
            })),
        ],
    };
    console.log('Slack message payload:');
    console.log(JSON.stringify(slackMessage, null, 2));
    // In production, you would POST this to your Slack webhook:
    // await fetch(process.env.SLACK_WEBHOOK_URL, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(slackMessage),
    // });
}
/**
 * Run all examples
 */
async function main() {
    try {
        await example1_ParseBacklog();
        await example2_FullPipeline();
        await example3_GitHubIntegration();
        await example4_CustomConfig();
        await example5_FilteringQueries();
        await example6_ToolIntegration();
        console.log('\n✅ All examples completed successfully!');
    }
    catch (error) {
        console.error('\n❌ Error running examples:', error.message);
        process.exit(1);
    }
}
// Run if executed directly
if (require.main === module) {
    main();
}
