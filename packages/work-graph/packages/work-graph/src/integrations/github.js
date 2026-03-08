"use strict";
/**
 * Summit Work Graph - GitHub Integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubIntegration = void 0;
class GitHubIntegration {
    config;
    graphStore;
    eventBus;
    prMap = new Map();
    constructor(config, graphStore, eventBus) {
        this.config = config;
        this.graphStore = graphStore;
        this.eventBus = eventBus;
    }
    async syncPRs() {
        const result = { prsCreated: 0, prsUpdated: 0, edgesCreated: 0, errors: [] };
        try {
            const prs = await this.fetchOpenPRs();
            for (const ghPR of prs) {
                try {
                    const existing = await this.findPRNode(ghPR.number);
                    if (existing) {
                        await this.updatePRNode(existing, ghPR);
                        result.prsUpdated++;
                    }
                    else {
                        const node = await this.createPRNode(ghPR);
                        result.prsCreated++;
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
            reviewers: ghPR.requested_reviewers.map(r => r.login),
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
    async updatePRNode(nodeId, ghPR) {
        const checksStatus = await this.getChecksStatus(ghPR.head.sha);
        await this.graphStore.updateNode(nodeId, {
            title: ghPR.title,
            description: ghPR.body ?? '',
            status: this.mapPRStatus(ghPR),
            checksStatus,
            reviewers: ghPR.requested_reviewers.map(r => r.login),
            additions: ghPR.additions,
            deletions: ghPR.deletions,
            filesChanged: ghPR.changed_files,
            mergedAt: ghPR.merged_at ? new Date(ghPR.merged_at) : undefined,
        });
        if (ghPR.merged) {
            await this.eventBus.publish({
                type: 'pr.merged',
                source: { system: 'github', component: 'pr-sync', nodeId },
                actor: { id: ghPR.user.login, type: 'human' },
                payload: { prNumber: ghPR.number, prId: nodeId },
            });
        }
    }
    async linkPRToTicket(prId, ticketIdentifier) {
        const tickets = await this.graphStore.getNodes({ type: 'ticket' });
        const ticket = tickets.find(t => t.linearId === ticketIdentifier || t.jiraKey === ticketIdentifier);
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
    }
    async trackDeployment(environment, version, prNumbers) {
        const envNodes = await this.graphStore.getNodes({ type: 'environment', name: environment });
        let envNode;
        if (envNodes.length > 0) {
            envNode = await this.graphStore.updateNode(envNodes[0].id, { version, deployedAt: new Date(), health: 'healthy' });
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
    async fetchOpenPRs() {
        const response = await fetch(`https://api.github.com/repos/${this.config.owner}/${this.config.repo}/pulls?state=open`, {
            headers: { Authorization: `Bearer ${this.config.token}`, Accept: 'application/vnd.github.v3+json' },
        });
        if (!response.ok)
            throw new Error(`GitHub API error: ${response.status}`);
        return response.json();
    }
    async getChecksStatus(sha) {
        try {
            const response = await fetch(`https://api.github.com/repos/${this.config.owner}/${this.config.repo}/commits/${sha}/check-runs`, {
                headers: { Authorization: `Bearer ${this.config.token}`, Accept: 'application/vnd.github.v3+json' },
            });
            if (!response.ok)
                return 'pending';
            const data = await response.json();
            if (data.check_runs.length === 0)
                return 'pending';
            if (data.check_runs.some((c) => c.conclusion === 'failure'))
                return 'failing';
            if (data.check_runs.every((c) => c.conclusion === 'success'))
                return 'passing';
            return 'pending';
        }
        catch {
            return 'pending';
        }
    }
    async findPRNode(prNumber) {
        if (this.prMap.has(prNumber))
            return this.prMap.get(prNumber);
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
        return ['bot', 'agent', 'claude', 'copilot', 'dependabot'].some(p => login.toLowerCase().includes(p));
    }
    extractTicketId(ghPR) {
        const patterns = [ghPR.head.ref, ghPR.title, ghPR.body || ''];
        for (const text of patterns) {
            const match = text.match(/(SUMMIT-\d+|[A-Z]+-\d+)/i);
            if (match)
                return match[1].toUpperCase();
        }
        return null;
    }
}
exports.GitHubIntegration = GitHubIntegration;
