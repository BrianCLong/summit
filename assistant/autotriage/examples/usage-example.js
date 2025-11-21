/**
 * Autotriage Usage Examples
 *
 * Demonstrates various ways to use the autotriage engine
 * programmatically in your own scripts and integrations.
 */
import { parseBacklog } from '../data/backlog-parser.js';
import { parseBugBash } from '../data/bugbash-parser.js';
import { fetchGitHubIssues } from '../data/github-fetcher.js';
import { detectAreas } from '../classifier/area-detector.js';
import { analyzeImpact } from '../classifier/impact-analyzer.js';
import { classifyType } from '../classifier/type-classifier.js';
import { clusterIssues } from '../classifier/issue-clusterer.js';
import { generateTriageReport, formatReportAsMarkdown } from '../reports/triage-report.js';
import { defaultConfig } from '../config.js';
/**
 * Example 1: Parse backlog only
 */
export async function example1_ParseBacklog() {
    console.log('Example 1: Parse Backlog\n');
    const items = await parseBacklog('./examples/sample-backlog.json');
    console.log(`Parsed ${items.length} backlog items`);
    items.forEach((item) => {
        console.log(`- [${item.id}] ${item.title} (${item.impact})`);
    });
}
/**
 * Example 2: Full triage pipeline with classification
 */
export async function example2_FullPipeline() {
    console.log('\nExample 2: Full Triage Pipeline\n');
    // Step 1: Collect items from all sources
    const backlogItems = await parseBacklog();
    const bugBashItems = await parseBugBash();
    const items = [...backlogItems, ...bugBashItems];
    console.log(`Collected ${items.length} items`);
    // Step 2: Classify each item
    items.forEach((item) => {
        // Detect areas
        if (item.area.length === 0) {
            item.area = detectAreas(item, defaultConfig.areas);
        }
        // Analyze impact
        const impactResult = analyzeImpact(item, defaultConfig.impactRules);
        item.impact = impactResult.impact;
        item.impactScore = impactResult.score;
        // Classify type
        item.type = classifyType(item, defaultConfig.typeRules);
        // Determine if good first issue
        item.isGoodFirstIssue =
            item.complexityScore <= defaultConfig.reporting.goodFirstIssueThreshold;
    });
    console.log('Classification complete');
    // Step 3: Cluster similar issues
    const clusters = clusterIssues(items, defaultConfig.clustering);
    console.log(`Found ${clusters.length} clusters`);
    // Step 4: Generate report
    const report = generateTriageReport(items, clusters, defaultConfig.reporting.topIssuesCount, defaultConfig.reporting.topThemesCount);
    const markdown = formatReportAsMarkdown(report);
    console.log('\nGenerated report preview:');
    console.log(markdown.substring(0, 500) + '...');
    return report;
}
/**
 * Example 3: GitHub integration with error handling
 */
export async function example3_GitHubIntegration() {
    console.log('\nExample 3: GitHub Integration\n');
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.warn('GITHUB_TOKEN not set. Using unauthenticated requests (rate limited).');
    }
    try {
        const items = await fetchGitHubIssues({
            owner: 'BrianCLong',
            repo: 'summit',
            token,
            state: 'open',
            maxResults: 50,
            retryAttempts: 3,
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
export async function example4_CustomConfig() {
    console.log('\nExample 4: Custom Configuration\n');
    // Create custom area configuration
    const customAreas = [
        ...defaultConfig.areas,
        {
            name: 'mobile',
            keywords: ['mobile', 'ios', 'android', 'app'],
            patterns: [/mobile/i, /\bios\b/i, /android/i],
            weight: 1.0,
        },
    ];
    // Parse and classify with custom config
    const items = await parseBacklog('./examples/sample-backlog.json');
    items.forEach((item) => {
        item.area = detectAreas(item, customAreas);
    });
    console.log('Classified with custom areas:');
    items.forEach((item) => {
        console.log(`- ${item.title}: [${item.area.join(', ')}]`);
    });
}
/**
 * Example 5: Filtering and querying
 */
export async function example5_FilteringQueries() {
    console.log('\nExample 5: Filtering and Queries\n');
    const items = await parseBacklog('./examples/sample-backlog.json');
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
export async function example6_ToolIntegration() {
    console.log('\nExample 6: Tool Integration\n');
    // This example shows how to integrate autotriage with other tools
    // For example, posting results to Slack or creating GitHub issues
    const items = await parseBacklog('./examples/sample-backlog.json');
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
//# sourceMappingURL=usage-example.js.map