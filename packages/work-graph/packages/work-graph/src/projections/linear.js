"use strict";
/**
 * Summit Work Graph - Linear Projection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinearProjection = void 0;
class LinearProjection {
    config;
    graphStore;
    linearIdMap = new Map();
    constructor(config, graphStore) {
        this.config = config;
        this.graphStore = graphStore;
    }
    async syncFromLinear() {
        const result = { created: 0, updated: 0, errors: [] };
        try {
            const issues = await this.fetchIssues();
            for (const issue of issues) {
                try {
                    const existing = await this.findTicketByLinearId(issue.id);
                    if (existing) {
                        await this.updateTicketFromLinear(existing, issue);
                        result.updated++;
                    }
                    else {
                        await this.createTicketFromLinear(issue);
                        result.created++;
                    }
                }
                catch (error) {
                    result.errors.push('Issue ' + issue.identifier + ': ' + error);
                }
            }
        }
        catch (error) {
            result.errors.push('Fetch failed: ' + error);
        }
        return result;
    }
    async pushToLinear(ticketId) {
        const ticket = await this.graphStore.getNode(ticketId);
        if (!ticket)
            return null;
        if (ticket.linearId) {
            await this.updateLinearIssue(ticket);
            return ticket.linearId;
        }
        else {
            const linearId = await this.createLinearIssue(ticket);
            await this.graphStore.updateNode(ticketId, { linearId });
            return linearId;
        }
    }
    async handleWebhook(payload) {
        const { action, data } = payload;
        if (action === 'create' || action === 'update') {
            const existing = await this.findTicketByLinearId(data.id);
            if (existing) {
                await this.updateTicketFromLinear(existing, data);
            }
            else {
                await this.createTicketFromLinear(data);
            }
        }
        else if (action === 'remove') {
            const existing = await this.findTicketByLinearId(data.id);
            if (existing) {
                await this.graphStore.updateNode(existing, { status: 'done' });
            }
        }
    }
    async fetchIssues() {
        const query = 'query { issues(filter: { team: { id: { eq: "' + this.config.teamId + '" } } }) { nodes { id identifier title description state { name type } priority estimate assignee { id name } labels { nodes { name } } dueDate createdAt updatedAt cycle { id name } parent { id } } } }';
        const response = await fetch('https://api.linear.app/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.config.apiKey,
            },
            body: JSON.stringify({ query }),
        });
        if (!response.ok)
            throw new Error('Linear API error: ' + response.status);
        const json = await response.json();
        return json.data?.issues?.nodes || [];
    }
    async findTicketByLinearId(linearId) {
        if (this.linearIdMap.has(linearId))
            return this.linearIdMap.get(linearId);
        const tickets = await this.graphStore.getNodes({ type: 'ticket', linearId });
        if (tickets.length > 0) {
            this.linearIdMap.set(linearId, tickets[0].id);
            return tickets[0].id;
        }
        return null;
    }
    async createTicketFromLinear(issue) {
        const ticket = {
            id: crypto.randomUUID(),
            type: 'ticket',
            createdAt: new Date(issue.createdAt),
            updatedAt: new Date(issue.updatedAt),
            createdBy: 'linear-sync',
            title: issue.title,
            description: issue.description || '',
            status: this.mapLinearStatus(issue.state.type),
            priority: this.mapLinearPriority(issue.priority),
            estimate: issue.estimate || undefined,
            assignee: issue.assignee?.name,
            labels: issue.labels.nodes.map(l => l.name),
            dueDate: issue.dueDate ? new Date(issue.dueDate) : undefined,
            linearId: issue.id,
            cycleId: issue.cycle?.id,
            agentEligible: this.isAgentEligible(issue),
            complexity: this.estimateComplexity(issue),
        };
        const created = await this.graphStore.createNode(ticket);
        this.linearIdMap.set(issue.id, created.id);
        // Link to parent if exists
        if (issue.parent) {
            const parentId = await this.findTicketByLinearId(issue.parent.id);
            if (parentId) {
                await this.graphStore.createEdge({
                    id: crypto.randomUUID(),
                    type: 'implements',
                    sourceId: created.id,
                    targetId: parentId,
                    createdAt: new Date(),
                    createdBy: 'linear-sync',
                    weight: 1,
                });
            }
        }
        return created;
    }
    async updateTicketFromLinear(ticketId, issue) {
        await this.graphStore.updateNode(ticketId, {
            title: issue.title,
            description: issue.description || '',
            status: this.mapLinearStatus(issue.state.type),
            priority: this.mapLinearPriority(issue.priority),
            estimate: issue.estimate || undefined,
            assignee: issue.assignee?.name,
            labels: issue.labels.nodes.map(l => l.name),
            dueDate: issue.dueDate ? new Date(issue.dueDate) : undefined,
        });
    }
    async createLinearIssue(ticket) {
        const mutation = 'mutation { issueCreate(input: { teamId: "' + this.config.teamId + '", title: "' + ticket.title.replace(/"/g, '\\"') + '", description: "' + (ticket.description || '').replace(/"/g, '\\"') + '", priority: ' + this.reverseMapPriority(ticket.priority) + ' }) { success issue { id } } }';
        const response = await fetch('https://api.linear.app/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.config.apiKey,
            },
            body: JSON.stringify({ query: mutation }),
        });
        const json = await response.json();
        return json.data?.issueCreate?.issue?.id;
    }
    async updateLinearIssue(ticket) {
        const mutation = 'mutation { issueUpdate(id: "' + ticket.linearId + '", input: { title: "' + ticket.title.replace(/"/g, '\\"') + '", description: "' + (ticket.description || '').replace(/"/g, '\\"') + '" }) { success } }';
        await fetch('https://api.linear.app/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.config.apiKey,
            },
            body: JSON.stringify({ query: mutation }),
        });
    }
    mapLinearStatus(stateType) {
        const mapping = {
            backlog: 'backlog',
            unstarted: 'ready',
            started: 'in_progress',
            completed: 'done',
            canceled: 'done',
        };
        return mapping[stateType] || 'backlog';
    }
    mapLinearPriority(priority) {
        if (priority === 1)
            return 'P0';
        if (priority === 2)
            return 'P1';
        if (priority === 3)
            return 'P2';
        return 'P3';
    }
    reverseMapPriority(priority) {
        const mapping = { P0: 1, P1: 2, P2: 3, P3: 4 };
        return mapping[priority];
    }
    isAgentEligible(issue) {
        const labels = issue.labels.nodes.map(l => l.name.toLowerCase());
        if (labels.includes('agent-eligible') || labels.includes('automate'))
            return true;
        if (issue.priority <= 2)
            return false; // P0/P1 need humans
        return issue.estimate !== null && issue.estimate <= 3;
    }
    estimateComplexity(issue) {
        if (!issue.estimate)
            return 'unknown';
        if (issue.estimate <= 1)
            return 'trivial';
        if (issue.estimate <= 2)
            return 'simple';
        if (issue.estimate <= 5)
            return 'medium';
        return 'complex';
    }
}
exports.LinearProjection = LinearProjection;
