/**
 * Parser for bug-bash markdown files
 */
import * as fs from 'fs';
import * as path from 'path';
export async function parseBugBash(bugBashDir) {
    const dirPath = bugBashDir || path.join(process.cwd(), 'bug-bash-results', '20250922');
    if (!fs.existsSync(dirPath)) {
        console.warn(`Bug-bash directory not found: ${dirPath}`);
        return [];
    }
    const items = [];
    // Parse P0, P1, P2 files
    const priorities = [
        { file: 'P0-critical.md', impact: 'blocker' },
        { file: 'P1-degraded.md', impact: 'high' },
        { file: 'P2-papercuts.md', impact: 'medium' },
    ];
    for (const { file, impact } of priorities) {
        const filePath = path.join(dirPath, file);
        if (!fs.existsSync(filePath))
            continue;
        const content = fs.readFileSync(filePath, 'utf8');
        const issues = parseMarkdownIssues(content, impact);
        items.push(...issues);
    }
    return items;
}
function parseMarkdownIssues(content, defaultImpact) {
    const items = [];
    // Split by issue blocks (looking for **Issue ID** pattern)
    const issueBlocks = content.split(/(?=\*\*Issue ID\*\*)/);
    for (const block of issueBlocks) {
        if (!block.trim() || block.includes('## Template'))
            continue;
        const issue = parseIssueBlock(block);
        if (!issue.issueId)
            continue;
        const description = [
            issue.description,
            issue.stepsToReproduce
                ? `Steps to Reproduce:\n${issue.stepsToReproduce.join('\n')}`
                : '',
            issue.expectedResult ? `Expected: ${issue.expectedResult}` : '',
            issue.actualResult ? `Actual: ${issue.actualResult}` : '',
            issue.impact ? `Impact: ${issue.impact}` : '',
            issue.workaround ? `Workaround: ${issue.workaround}` : '',
        ]
            .filter(Boolean)
            .join('\n\n');
        const item = {
            id: issue.issueId,
            title: issue.description || issue.issueId,
            description,
            source: 'bugbash',
            sourceId: issue.issueId,
            area: [],
            impact: defaultImpact,
            type: 'bug', // Bug-bash items are bugs by default
            component: issue.component,
            owner: issue.assignee,
            status: issue.status || 'Open',
            runbook: issue.runbook,
            environment: issue.environment,
            impactScore: 0,
            complexityScore: calculateBugComplexity(issue),
            isGoodFirstIssue: false,
            raw: issue,
        };
        items.push(item);
    }
    return items;
}
function parseIssueBlock(block) {
    const issue = {
        issueId: '',
        description: '',
    };
    // Extract fields using regex
    const extractField = (fieldName) => {
        const regex = new RegExp(`\\*\\*${fieldName}\\*\\*:?\\s*(.+?)(?=\\n\\*\\*|\\n\\n|$)`, 'is');
        const match = block.match(regex);
        return match ? match[1].trim() : undefined;
    };
    issue.issueId = extractField('Issue ID') || '';
    issue.component = extractField('Component');
    issue.runbook = extractField('Runbook');
    issue.description = extractField('Description') || '';
    issue.expectedResult = extractField('Expected Result');
    issue.actualResult = extractField('Actual Result');
    issue.environment = extractField('Environment');
    issue.browser = extractField('Browser/Client');
    issue.assignee = extractField('Assignee');
    issue.status = extractField('Status');
    issue.impact = extractField('Impact');
    issue.workaround = extractField('Workaround');
    // Parse steps to reproduce
    const stepsMatch = block.match(/\*\*Steps to Reproduce\*\*:?\s*([\s\S]+?)(?=\n\*\*|$)/i);
    if (stepsMatch) {
        const stepsText = stepsMatch[1];
        issue.stepsToReproduce = stepsText
            .split('\n')
            .map((s) => s.trim())
            .filter((s) => s && /^\d+\./.test(s));
    }
    const priorityMatch = extractField('Priority Score');
    if (priorityMatch) {
        issue.priorityScore = parseInt(priorityMatch, 10);
    }
    return issue;
}
function calculateBugComplexity(issue) {
    let score = 20; // Base complexity for bugs
    // Steps to reproduce complexity
    if (issue.stepsToReproduce && issue.stepsToReproduce.length > 3) {
        score += 10;
    }
    // Environment-specific bugs are more complex
    if (issue.environment || issue.browser) {
        score += 5;
    }
    // Has workaround = slightly less complex
    if (issue.workaround) {
        score -= 5;
    }
    return Math.max(score, 10);
}
//# sourceMappingURL=bugbash-parser.js.map