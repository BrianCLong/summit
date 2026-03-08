"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const citizen_deliberation_js_1 = require("../src/feedback/citizen-deliberation.js");
(0, vitest_1.describe)('CitizenDeliberationPlatform', () => {
    let platform;
    (0, vitest_1.beforeEach)(() => {
        platform = new citizen_deliberation_js_1.CitizenDeliberationPlatform();
    });
    (0, vitest_1.describe)('createProposal', () => {
        (0, vitest_1.it)('should create a proposal with all fields', () => {
            const proposal = platform.createProposal('Build New Park', 'Proposal to build a community park', 'initiative', 'citizen-1', { closesAt: '2025-12-31T23:59:59Z', tags: ['parks', 'community'] });
            (0, vitest_1.expect)(proposal.proposalId).toBeDefined();
            (0, vitest_1.expect)(proposal.title).toBe('Build New Park');
            (0, vitest_1.expect)(proposal.category).toBe('initiative');
            (0, vitest_1.expect)(proposal.status).toBe('draft');
            (0, vitest_1.expect)(proposal.tags).toContain('parks');
        });
    });
    (0, vitest_1.describe)('addComment', () => {
        (0, vitest_1.it)('should add comment to proposal', () => {
            const proposal = platform.createProposal('Test', 'Description', 'policy', 'author-1', { closesAt: '2025-12-31T23:59:59Z' });
            const comment = platform.addComment(proposal.proposalId, 'citizen-2', 'I support this!', 'support');
            (0, vitest_1.expect)(comment.commentId).toBeDefined();
            (0, vitest_1.expect)(comment.sentiment).toBe('support');
            (0, vitest_1.expect)(comment.proposalId).toBe(proposal.proposalId);
        });
        (0, vitest_1.it)('should support threaded comments', () => {
            const proposal = platform.createProposal('Test', 'Desc', 'policy', 'a1', { closesAt: '2025-12-31T23:59:59Z' });
            const parent = platform.addComment(proposal.proposalId, 'c1', 'Parent', 'neutral');
            const reply = platform.addComment(proposal.proposalId, 'c2', 'Reply', 'support', parent.commentId);
            (0, vitest_1.expect)(reply.parentId).toBe(parent.commentId);
        });
    });
    (0, vitest_1.describe)('recordPreference', () => {
        (0, vitest_1.it)('should track citizen preferences', () => {
            const proposal = platform.createProposal('Test', 'Desc', 'policy', 'a1', { closesAt: '2025-12-31T23:59:59Z' });
            platform.recordPreference(proposal.proposalId, 'citizen-1', 'support', 'Good idea');
            platform.recordPreference(proposal.proposalId, 'citizen-2', 'strongly_support', 'Great!');
            const analytics = platform.getProposalAnalytics(proposal.proposalId);
            (0, vitest_1.expect)(analytics.preferenceBreakdown.support).toBe(1);
            (0, vitest_1.expect)(analytics.preferenceBreakdown.strongly_support).toBe(1);
        });
        (0, vitest_1.it)('should replace existing preference from same citizen', () => {
            const proposal = platform.createProposal('Test', 'Desc', 'policy', 'a1', { closesAt: '2025-12-31T23:59:59Z' });
            platform.recordPreference(proposal.proposalId, 'citizen-1', 'support', 'Maybe');
            platform.recordPreference(proposal.proposalId, 'citizen-1', 'oppose', 'Changed mind');
            const analytics = platform.getProposalAnalytics(proposal.proposalId);
            (0, vitest_1.expect)(analytics.preferenceBreakdown.support).toBe(0);
            (0, vitest_1.expect)(analytics.preferenceBreakdown.oppose).toBe(1);
        });
    });
    (0, vitest_1.describe)('startDeliberation', () => {
        (0, vitest_1.it)('should create deliberation session', () => {
            const proposal = platform.createProposal('Test', 'Desc', 'policy', 'a1', { closesAt: '2025-12-31T23:59:59Z' });
            const session = platform.startDeliberation(proposal.proposalId, ['c1', 'c2', 'c3'], 'mod-1', 60);
            (0, vitest_1.expect)(session.sessionId).toBeDefined();
            (0, vitest_1.expect)(session.participantIds).toHaveLength(3);
            (0, vitest_1.expect)(session.moderatorId).toBe('mod-1');
        });
    });
    (0, vitest_1.describe)('submitBudgetAllocation', () => {
        (0, vitest_1.it)('should accept valid budget allocation', () => {
            const allocation = platform.submitBudgetAllocation('citizen-1', new Map([['project-a', 5000], ['project-b', 3000]]), 10000);
            (0, vitest_1.expect)(allocation.citizenId).toBe('citizen-1');
            (0, vitest_1.expect)(allocation.allocations.get('project-a')).toBe(5000);
        });
        (0, vitest_1.it)('should reject over-budget allocation', () => {
            (0, vitest_1.expect)(() => platform.submitBudgetAllocation('citizen-1', new Map([['project-a', 15000]]), 10000)).toThrow('Allocation exceeds available budget');
        });
    });
    (0, vitest_1.describe)('aggregateBudgetResults', () => {
        (0, vitest_1.it)('should aggregate multiple citizen allocations', () => {
            platform.submitBudgetAllocation('c1', new Map([['p1', 100], ['p2', 50]]), 200);
            platform.submitBudgetAllocation('c2', new Map([['p1', 80], ['p3', 70]]), 200);
            const results = platform.aggregateBudgetResults();
            (0, vitest_1.expect)(results.get('p1')).toBe(180);
            (0, vitest_1.expect)(results.get('p2')).toBe(50);
            (0, vitest_1.expect)(results.get('p3')).toBe(70);
        });
    });
    (0, vitest_1.describe)('getProposalsByStatus', () => {
        (0, vitest_1.it)('should filter proposals by status', () => {
            platform.createProposal('A', 'd', 'policy', 'a1', { closesAt: '2025-12-31T23:59:59Z' });
            platform.createProposal('B', 'd', 'policy', 'a2', { closesAt: '2025-12-31T23:59:59Z' });
            const drafts = platform.getProposalsByStatus('draft');
            (0, vitest_1.expect)(drafts).toHaveLength(2);
        });
    });
});
(0, vitest_1.describe)('ContentModerator', () => {
    let moderator;
    (0, vitest_1.beforeEach)(() => {
        moderator = new citizen_deliberation_js_1.ContentModerator();
    });
    (0, vitest_1.it)('should approve clean content', () => {
        const result = moderator.moderate('This is a great proposal for our community!');
        (0, vitest_1.expect)(result.approved).toBe(true);
        (0, vitest_1.expect)(result.flags).toHaveLength(0);
    });
    (0, vitest_1.it)('should flag content with blocklisted words', () => {
        const result = moderator.moderate('This is spam content');
        (0, vitest_1.expect)(result.approved).toBe(false);
        (0, vitest_1.expect)(result.flags.some((f) => f.includes('spam'))).toBe(true);
    });
    (0, vitest_1.it)('should flag threatening content', () => {
        const result = moderator.moderate('This contains a threat to someone');
        (0, vitest_1.expect)(result.approved).toBe(false);
        (0, vitest_1.expect)(result.flags.length).toBeGreaterThan(0);
    });
});
