"use strict";
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
                catch (e) {
                    result.errors.push(issue.identifier + ': ' + e);
                }
            }
        }
        catch (e) {
            result.errors.push('Fetch failed: ' + e);
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
        const linearId = await this.createLinearIssue(ticket);
        await this.graphStore.updateNode(ticketId, { linearId });
        return linearId;
    }
    async fetchIssues() {
        const query = 'query { issues(filter: { team: { id: { eq: "' + this.config.teamId + '" } } }) { nodes { id identifier title description state { name type } priority estimate assignee { id name } labels { nodes { name } } dueDate createdAt updatedAt cycle { id name } parent { id } } } }';
        const response = await fetch('https://api.linear.app/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': this.config.apiKey }, body: JSON.stringify({ query }) });
        if (!response.ok)
            throw new Error('API error: ' + response.status);
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
            id: crypto.randomUUID(), type: 'ticket', createdAt: new Date(issue.createdAt), updatedAt: new Date(issue.updatedAt),
            createdBy: 'linear-sync', title: issue.title, description: issue.description || '',
            status: this.mapStatus(issue.state.type), priority: this.mapPriority(issue.priority), ticketType: 'unknown',
            estimate: issue.estimate || undefined, assignee: issue.assignee?.name, labels: issue.labels.nodes.map(l => l.name),
            dueDate: issue.dueDate ? new Date(issue.dueDate) : undefined, linearId: issue.id, cycleId: issue.cycle?.id,
            agentEligible: issue.priority > 2 && (issue.estimate || 0) <= 3, complexity: this.mapComplexity(issue.estimate),
        };
        const created = await this.graphStore.createNode(ticket);
        this.linearIdMap.set(issue.id, created.id);
        return created;
    }
    async updateTicketFromLinear(ticketId, issue) {
        await this.graphStore.updateNode(ticketId, {
            title: issue.title, description: issue.description || '', status: this.mapStatus(issue.state.type),
            priority: this.mapPriority(issue.priority), estimate: issue.estimate || undefined, assignee: issue.assignee?.name,
            labels: issue.labels.nodes.map(l => l.name), dueDate: issue.dueDate ? new Date(issue.dueDate) : undefined,
        });
    }
    async createLinearIssue(ticket) {
        const mutation = 'mutation { issueCreate(input: { teamId: "' + this.config.teamId + '", title: "' + ticket.title.replace(/"/g, '\\"') + '", priority: ' + this.reversePriority(ticket.priority) + ' }) { success issue { id } } }';
        const response = await fetch('https://api.linear.app/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': this.config.apiKey }, body: JSON.stringify({ query: mutation }) });
        const json = await response.json();
        return json.data?.issueCreate?.issue?.id;
    }
    async updateLinearIssue(ticket) {
        const mutation = 'mutation { issueUpdate(id: "' + ticket.linearId + '", input: { title: "' + ticket.title.replace(/"/g, '\\"') + '" }) { success } }';
        await fetch('https://api.linear.app/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': this.config.apiKey }, body: JSON.stringify({ query: mutation }) });
    }
    mapStatus(stateType) { return { backlog: 'backlog', unstarted: 'ready', started: 'in_progress', completed: 'done', canceled: 'done' }[stateType] || 'backlog'; }
    mapPriority(p) { return [, 'P0', 'P1', 'P2', 'P3'][p] || 'P3'; }
    reversePriority(p) { return { P0: 1, P1: 2, P2: 3, P3: 4 }[p]; }
    mapComplexity(e) { if (!e)
        return 'unknown'; if (e <= 1)
        return 'trivial'; if (e <= 2)
        return 'simple'; if (e <= 5)
        return 'medium'; return 'complex'; }
}
exports.LinearProjection = LinearProjection;
