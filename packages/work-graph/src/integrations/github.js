"use strict";
/**
 * Summit Work Graph - GitHub Integration
 *
 * Bidirectional sync with GitHub for:
 * - PR tracking and status
 * - Issue linking
 * - Check status monitoring
 * - Deployment tracking
 * - Code review management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubIntegration = void 0;
// ============================================
// GitHub Integration
// ============================================
class GitHubIntegration {
    config;
    graphStore;
    eventBus;
    prMap = new Map(); // PR number -> node ID
    constructor(config, graphStore, eventBus) {
        this.config = config;
        this.graphStore = graphStore;
        this.eventBus = eventBus;
    }
    // ============================================
    // PR Operations
    // ============================================
    /**
     * Sync all open PRs from GitHub
     */
    async syncPRs() {
        const result = {
            prsCreated: 0,
            prsUpdated: 0,
            edgesCreated: 0,
            errors: [],
        };
        try {
            const prs = await this.fetchOpenPRs();
            for (const ghPR of prs) {
                try {
                    const existingNode = await this.findPRNode(ghPR.number);
                    if (existingNode) {
                        await this.updatePRNode(existingNode, ghPR);
                        result.prsUpdated++;
                    }
                    else {
                        const node = await this.createPRNode(ghPR);
                        result.prsCreated++;
                        // Try to link to ticket
                        const ticketId = this.extractTicketId(ghPR);
                        if (ticketId) {
                            await this.linkPRToTicket(node.id, ticketId);
                            result.edgesCreated++;
                        }
                    }
                }
                catch (error) {
                    result.errors.push(`PR #${ghPR.number}: ${error}`);
                }
            }
        }
        catch (error) {
            result.errors.push(`Fetch failed: ${error}`);
        }
        return result;
    }
    /**
     * Create a PR node in the graph
     */
    async createPRNode(ghPR) {
        const checksStatus = await this.getChecksStatus(ghPR.head.sha);
        const prNode = {
            type: 'pr',
            createdBy: 'github-sync',
            title: ghPR.title,
            description: ghPR.body ?? '',
            url: `https://github.com/${this.config.owner}/${this.config.repo}/pull/${ghPR.number}`,
            number: ghPR.number,
            author: ghPR.user.login,
            authorType: this.isAgentAuthor(ghPR.user.login) ? 'agent' : 'human',
            status: this.mapPRStatus(ghPR),
            checksStatus,
            reviewers: ghPR.requested_reviewers.map((r) => r.login),
            additions: ghPR.additions,
            deletions: ghPR.deletions,
            filesChanged: ghPR.changed_files,
            branch: ghPR.head.ref,
            mergedAt: ghPR.merged_at ? new Date(ghPR.merged_at) : undefined,
        };
        const created = await this.graphStore.createNode({
            ...prNode,
            id: crypto.randomUUID(),
            createdAt: new Date(ghPR.created_at),
            updatedAt: new Date(ghPR.updated_at),
        });
        this.prMap.set(ghPR.number, created.id);
        await this.eventBus.publish({
            type: 'pr.opened',
            source: { system: 'github', component: 'pr-sync', nodeId: created.id },
            actor: { id: ghPR.user.login, type: this.isAgentAuthor(ghPR.user.login) ? 'agent' : 'human' },
            payload: { prNumber: ghPR.number, prId: created.id, title: ghPR.title },
        });
        return created;
    }
    /**
     * Update a PR node from GitHub state
     */
    async updatePRNode(nodeId, ghPR) {
        const checksStatus = await this.getChecksStatus(ghPR.head.sha);
        const status = this.mapPRStatus(ghPR);
        const updates = {
            title: ghPR.title,
            description: ghPR.body ?? '',
            status,
            checksStatus,
            reviewers: ghPR.requested_reviewers.map((r) => r.login),
            additions: ghPR.additions,
            deletions: ghPR.deletions,
            filesChanged: ghPR.changed_files,
            mergedAt: ghPR.merged_at ? new Date(ghPR.merged_at) : undefined,
        };
        await this.graphStore.updateNode(nodeId, updates);
        if (ghPR.merged) {
            await this.eventBus.publish({
                type: 'pr.merged',
                source: { system: 'github', component: 'pr-sync', nodeId },
                actor: { id: ghPR.user.login, type: 'human' },
                payload: { prNumber: ghPR.number, prId: nodeId },
            });
        }
    }
    /**
     * Handle GitHub webhook
     */
    async handleWebhook(payload) {
        if (payload.pull_request) {
            await this.handlePRWebhook(payload.action, payload.pull_request);
        }
        else if (payload.check_run) {
            await this.handleCheckWebhook(payload.action, payload.check_run);
        }
        else if (payload.deployment) {
            await this.handleDeploymentWebhook(payload.action, payload.deployment);
        }
    }
    // ============================================
    // Link Management
    // ============================================
    /**
     * Link a PR to a ticket
     */
    async linkPRToTicket(prId, ticketIdentifier) {
        // Find ticket by Linear ID or Jira key
        const tickets = await this.graphStore.getNodes({ type: 'ticket' });
        const ticket = tickets.find((t) => t.linearId === ticketIdentifier || t.jiraKey === ticketIdentifier);
        if (!ticket)
            return;
        await this.graphStore.createEdge({
            id: crypto.randomUUID(),
            type: 'implements',
            sourceId: prId,
            targetId: ticket.id,
            createdAt: new Date(),
            createdBy: 'github-sync',
            weight: 1,
            metadata: { autoLinked: true },
        });
        // Update ticket status if PR is merged
        const pr = await this.graphStore.getNode(prId);
        if (pr?.status === 'merged') {
            await this.graphStore.updateNode(ticket.id, { status: 'done' });
        }
    }
    /**
     * Get PR review status
     */
    async getPRReviewStatus(prNumber) {
        const reviews = await this.fetchPRReviews(prNumber);
        const reviewerStates = new Map();
        for (const review of reviews) {
            reviewerStates.set(review.user.login, review.state);
        }
        const reviewers = Array.from(reviewerStates.entries()).map(([login, state]) => ({
            login,
            state,
        }));
        return {
            approved: reviewers.some((r) => r.state === 'APPROVED'),
            changesRequested: reviewers.some((r) => r.state === 'CHANGES_REQUESTED'),
            reviewers,
        };
    }
    // ============================================
    // Deployment Tracking
    // ============================================
    /**
     * Create deployment event
     */
    async trackDeployment(environment, version, prNumbers) {
        // Create or update environment node
        const envNodes = await this.graphStore.getNodes({
            type: 'environment',
            name: environment,
        });
        let envNode;
        if (envNodes.length > 0) {
            envNode = await this.graphStore.updateNode(envNodes[0].id, {
                version,
                deployedAt: new Date(),
                health: 'healthy',
            });
        }
        else {
            envNode = await this.graphStore.createNode({
                id: crypto.randomUUID(),
                type: 'environment',
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'github-sync',
                name: environment,
                version,
                deployedAt: new Date(),
                health: 'healthy',
            });
        }
        // Link PRs to deployment
        for (const prNumber of prNumbers) {
            const prNodeId = this.prMap.get(prNumber);
            if (prNodeId) {
                await this.graphStore.createEdge({
                    id: crypto.randomUUID(),
                    type: 'deployed_to',
                    sourceId: prNodeId,
                    targetId: envNode.id,
                    createdAt: new Date(),
                    createdBy: 'github-sync',
                    weight: 1,
                    metadata: { version, deployedAt: new Date().toISOString() },
                });
            }
        }
    }
    // ============================================
    // Private Methods
    // ============================================
    async fetchOpenPRs() {
        const response = await fetch(`https://api.github.com/repos/${this.config.owner}/${this.config.repo}/pulls?state=open`, {
            headers: {
                Authorization: `Bearer ${this.config.token}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        return response.json();
    }
    async fetchPRReviews(prNumber) {
        const response = await fetch(`https://api.github.com/repos/${this.config.owner}/${this.config.repo}/pulls/${prNumber}/reviews`, {
            headers: {
                Authorization: `Bearer ${this.config.token}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        if (!response.ok)
            return [];
        return response.json();
    }
    async getChecksStatus(sha) {
        const response = await fetch(`https://api.github.com/repos/${this.config.owner}/${this.config.repo}/commits/${sha}/check-runs`, {
            headers: {
                Authorization: `Bearer ${this.config.token}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        if (!response.ok)
            return 'pending';
        const data = await response.json();
        const checkRuns = data.check_runs;
        if (checkRuns.length === 0)
            return 'pending';
        if (checkRuns.some((c) => c.conclusion === 'failure'))
            return 'failing';
        if (checkRuns.every((c) => c.conclusion === 'success'))
            return 'passing';
        return 'pending';
    }
    async findPRNode(prNumber) {
        if (this.prMap.has(prNumber)) {
            return this.prMap.get(prNumber);
        }
        const prs = await this.graphStore.getNodes({ type: 'pr', number: prNumber });
        if (prs.length > 0) {
            this.prMap.set(prNumber, prs[0].id);
            return prs[0].id;
        }
        return null;
    }
    mapPRStatus(ghPR) {
        if (ghPR.merged)
            return 'merged';
        if (ghPR.state === 'closed')
            return 'closed';
        if (ghPR.draft)
            return 'draft';
        return 'open';
    }
    isAgentAuthor(login) {
        const agentPatterns = ['bot', 'agent', 'claude', 'copilot', 'dependabot'];
        return agentPatterns.some((p) => login.toLowerCase().includes(p));
    }
    extractTicketId(ghPR) {
        // Check branch name
        const branchMatch = ghPR.head.ref.match(/(SUMMIT-\d+|[A-Z]+-\d+)/i);
        if (branchMatch)
            return branchMatch[1].toUpperCase();
        // Check title
        const titleMatch = ghPR.title.match(/(SUMMIT-\d+|[A-Z]+-\d+)/i);
        if (titleMatch)
            return titleMatch[1].toUpperCase();
        // Check body
        if (ghPR.body) {
            const bodyMatch = ghPR.body.match(/(SUMMIT-\d+|[A-Z]+-\d+)/i);
            if (bodyMatch)
                return bodyMatch[1].toUpperCase();
        }
        return null;
    }
    async handlePRWebhook(action, pr) {
        const nodeId = await this.findPRNode(pr.number);
        if (action === 'opened' || action === 'reopened') {
            if (!nodeId) {
                await this.createPRNode(pr);
            }
        }
        else if (action === 'closed' || action === 'synchronize' || action === 'edited') {
            if (nodeId) {
                await this.updatePRNode(nodeId, pr);
            }
        }
    }
    async handleCheckWebhook(action, check) {
        if (action !== 'completed')
            return;
        // Find PRs with this check and update their status
        const prs = await this.graphStore.getNodes({ type: 'pr', status: 'open' });
        for (const pr of prs) {
            // Would need to track SHA to PR mapping for accurate updates
            // For now, just trigger a full sync for open PRs
        }
    }
    async handleDeploymentWebhook(action, deployment) {
        if (action !== 'created')
            return;
        const environment = deployment.environment;
        await this.trackDeployment(environment, deployment.ref, []);
    }
}
exports.GitHubIntegration = GitHubIntegration;
