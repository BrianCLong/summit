/**
 * Parser for backlog.json
 */
import * as fs from 'fs';
import * as path from 'path';
export async function parseBacklog(backlogPath) {
    const filePath = backlogPath || path.join(process.cwd(), 'backlog', 'backlog.json');
    if (!fs.existsSync(filePath)) {
        console.warn(`Backlog file not found: ${filePath}`);
        return [];
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const backlog = JSON.parse(content);
    const items = [];
    for (const epic of backlog.epics) {
        for (const story of epic.stories) {
            const description = [
                `Epic: ${epic.title}`,
                story.acceptance_criteria ? `Acceptance Criteria:\n${story.acceptance_criteria.join('\n')}` : '',
            ]
                .filter(Boolean)
                .join('\n\n');
            const item = {
                id: story.id,
                title: story.title,
                description,
                source: 'backlog',
                sourceId: story.id,
                area: [],
                impact: mapPriorityToImpact(epic.priority),
                type: 'feature', // Default for backlog items
                owner: story.owner,
                status: 'planned',
                priority: epic.priority,
                impactScore: 0,
                complexityScore: calculateStoryComplexity(story),
                isGoodFirstIssue: false,
                raw: { epic, story },
            };
            items.push(item);
        }
    }
    return items;
}
function mapPriorityToImpact(priority) {
    const p = priority.toLowerCase();
    if (p.includes('must') || p.includes('p0'))
        return 'blocker';
    if (p.includes('should') || p.includes('p1'))
        return 'high';
    if (p.includes('could') || p.includes('p2'))
        return 'medium';
    return 'low';
}
function calculateStoryComplexity(story) {
    let score = 0;
    // Base complexity
    score += 10;
    // Dependencies add complexity
    if (story.depends_on && story.depends_on.length > 0) {
        score += story.depends_on.length * 15;
    }
    // More acceptance criteria = more complex
    if (story.acceptance_criteria) {
        score += story.acceptance_criteria.length * 5;
    }
    // Evidence hooks add complexity
    if (story.evidence_hooks && story.evidence_hooks.length > 0) {
        score += story.evidence_hooks.length * 10;
    }
    return score;
}
//# sourceMappingURL=backlog-parser.js.map