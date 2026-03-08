"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentModerator = exports.CitizenDeliberationPlatform = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class CitizenDeliberationPlatform {
    proposals = new Map();
    comments = new Map();
    preferences = new Map();
    sessions = new Map();
    budgetAllocations = new Map();
    /**
     * Create a new proposal
     */
    createProposal(title, description, category, authorId, options) {
        const proposal = {
            proposalId: node_crypto_1.default.randomUUID(),
            title,
            description,
            category,
            authorId,
            status: 'draft',
            createdAt: new Date().toISOString(),
            closesAt: options.closesAt,
            supportThreshold: options.supportThreshold || 100,
            currentSupport: 0,
            tags: options.tags || [],
        };
        this.proposals.set(proposal.proposalId, proposal);
        this.comments.set(proposal.proposalId, []);
        this.preferences.set(proposal.proposalId, []);
        return proposal;
    }
    /**
     * Submit feedback/comment on a proposal
     */
    addComment(proposalId, authorId, content, sentiment, parentId = null) {
        const comments = this.comments.get(proposalId);
        if (!comments) {
            throw new Error(`Proposal ${proposalId} not found`);
        }
        const comment = {
            commentId: node_crypto_1.default.randomUUID(),
            proposalId,
            authorId,
            content,
            sentiment,
            parentId,
            upvotes: 0,
            downvotes: 0,
            createdAt: new Date().toISOString(),
            isModerated: false,
        };
        comments.push(comment);
        return comment;
    }
    /**
     * Record citizen preference on a proposal
     */
    recordPreference(proposalId, citizenId, preference, reasoning) {
        const preferences = this.preferences.get(proposalId);
        const proposal = this.proposals.get(proposalId);
        if (!preferences || !proposal) {
            throw new Error(`Proposal ${proposalId} not found`);
        }
        // Remove existing preference from this citizen
        const existingIndex = preferences.findIndex((p) => p.citizenId === citizenId);
        if (existingIndex !== -1) {
            preferences.splice(existingIndex, 1);
        }
        const pref = {
            citizenId,
            proposalId,
            preference,
            reasoning,
            timestamp: new Date().toISOString(),
        };
        preferences.push(pref);
        // Update support count
        const supportPreferences = ['strongly_support', 'support'];
        proposal.currentSupport = preferences.filter((p) => supportPreferences.includes(p.preference)).length;
        return pref;
    }
    /**
     * Start a deliberation session
     */
    startDeliberation(proposalId, participantIds, moderatorId, duration) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) {
            throw new Error(`Proposal ${proposalId} not found`);
        }
        const session = {
            sessionId: node_crypto_1.default.randomUUID(),
            proposalId,
            participantIds,
            startTime: new Date().toISOString(),
            duration,
            moderatorId,
            summary: null,
            consensusLevel: 0,
            outcomes: [],
        };
        proposal.status = 'deliberation';
        this.sessions.set(session.sessionId, session);
        return session;
    }
    /**
     * Complete deliberation with outcomes
     */
    completeDeliberation(sessionId, summary, outcomes, consensusLevel) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        session.summary = summary;
        session.outcomes = outcomes;
        session.consensusLevel = Math.min(100, Math.max(0, consensusLevel));
        return session;
    }
    /**
     * Participatory budgeting allocation
     */
    submitBudgetAllocation(citizenId, projectAllocations, totalBudget) {
        // Validate total doesn't exceed budget
        const totalAllocated = Array.from(projectAllocations.values()).reduce((a, b) => a + b, 0);
        if (totalAllocated > totalBudget) {
            throw new Error('Allocation exceeds available budget');
        }
        const allocation = {
            citizenId,
            allocations: projectAllocations,
            totalBudget,
            submittedAt: new Date().toISOString(),
        };
        // Store by some budget cycle ID (simplified)
        const cycleId = 'current';
        const existing = this.budgetAllocations.get(cycleId) || [];
        // Replace existing allocation from this citizen
        const idx = existing.findIndex((a) => a.citizenId === citizenId);
        if (idx !== -1) {
            existing[idx] = allocation;
        }
        else {
            existing.push(allocation);
        }
        this.budgetAllocations.set(cycleId, existing);
        return allocation;
    }
    /**
     * Aggregate participatory budget results
     */
    aggregateBudgetResults(cycleId = 'current') {
        const allocations = this.budgetAllocations.get(cycleId) || [];
        const totals = new Map();
        for (const allocation of allocations) {
            for (const [projectId, amount] of allocation.allocations) {
                totals.set(projectId, (totals.get(projectId) || 0) + amount);
            }
        }
        return totals;
    }
    /**
     * Get proposal analytics
     */
    getProposalAnalytics(proposalId) {
        const proposal = this.proposals.get(proposalId);
        const comments = this.comments.get(proposalId) || [];
        const preferences = this.preferences.get(proposalId) || [];
        if (!proposal) {
            return null;
        }
        const sentimentBreakdown = {
            support: 0,
            oppose: 0,
            neutral: 0,
            question: 0,
        };
        for (const comment of comments) {
            sentimentBreakdown[comment.sentiment]++;
        }
        const preferenceBreakdown = {
            strongly_support: 0,
            support: 0,
            neutral: 0,
            oppose: 0,
            strongly_oppose: 0,
        };
        for (const pref of preferences) {
            preferenceBreakdown[pref.preference]++;
        }
        const relatedSessions = Array.from(this.sessions.values()).filter((s) => s.proposalId === proposalId);
        const averageConsensus = relatedSessions.length > 0
            ? relatedSessions.reduce((sum, s) => sum + s.consensusLevel, 0) /
                relatedSessions.length
            : 0;
        return {
            proposal,
            commentCount: comments.length,
            sentimentBreakdown,
            preferenceBreakdown,
            deliberationSessions: relatedSessions.length,
            averageConsensus,
        };
    }
    /**
     * Get all proposals by status
     */
    getProposalsByStatus(status) {
        return Array.from(this.proposals.values()).filter((p) => p.status === status);
    }
    /**
     * Transition proposal status
     */
    transitionProposal(proposalId, newStatus) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) {
            throw new Error(`Proposal ${proposalId} not found`);
        }
        proposal.status = newStatus;
        return proposal;
    }
}
exports.CitizenDeliberationPlatform = CitizenDeliberationPlatform;
/**
 * AI-powered content moderation for citizen feedback
 */
class ContentModerator {
    blocklist;
    flaggedPatterns;
    constructor() {
        this.blocklist = new Set(['spam', 'inappropriate']); // Simplified
        this.flaggedPatterns = [
            /\b(threat|violence)\b/i,
            /\b(personal.*info|doxx)\b/i,
        ];
    }
    /**
     * Check content for policy violations
     */
    moderate(content) {
        const flags = [];
        let confidence = 1.0;
        // Check blocklist
        const words = content.toLowerCase().split(/\s+/);
        for (const word of words) {
            if (this.blocklist.has(word)) {
                flags.push(`blocklist:${word}`);
                confidence *= 0.5;
            }
        }
        // Check patterns
        for (const pattern of this.flaggedPatterns) {
            if (pattern.test(content)) {
                flags.push(`pattern:${pattern.source}`);
                confidence *= 0.7;
            }
        }
        return {
            approved: flags.length === 0,
            flags,
            confidence,
        };
    }
}
exports.ContentModerator = ContentModerator;
