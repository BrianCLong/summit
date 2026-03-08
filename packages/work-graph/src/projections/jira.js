"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JiraProjection = void 0;
class JiraProjection {
    config;
    graphStore;
    jiraKeyMap = new Map();
    constructor(config, graphStore) {
        this.config = config;
        this.graphStore = graphStore;
    }
    async syncFromJira() {
        const result = { created: 0, updated: 0, errors: [] };
        try {
            const issues = await this.fetchIssues();
            for (const issue of issues) {
                try {
                    const existing = await this.findTicketByJiraKey(issue.key);
                    if (existing) {
                        await this.updateTicketFromJira(existing, issue);
                        result.updated++;
                    }
                    else {
                        await this.createTicketFromJira(issue);
                        result.created++;
                    }
                }
                catch (e) {
                    result.errors.push(issue.key + ': ' + e);
                }
            }
        }
        catch (e) {
            result.errors.push('Fetch failed: ' + e);
        }
        return result;
    }
    async pushToJira(ticketId) {
        const ticket = await this.graphStore.getNode(ticketId);
        if (!ticket)
            return null;
        if (ticket.jiraKey) {
            await this.updateJiraIssue(ticket);
            return ticket.jiraKey;
        }
        const jiraKey = await this.createJiraIssue(ticket);
        await this.graphStore.updateNode(ticketId, { jiraKey });
        return jiraKey;
    }
    async fetchIssues() {
        const jql = 'project = ' + this.config.projectKey + ' ORDER BY updated DESC';
        const url = 'https://' + this.config.host + '/rest/api/3/search?jql=' + encodeURIComponent(jql) + '&maxResults=100';
        const response = await fetch(url, { headers: { 'Authorization': 'Basic ' + Buffer.from(this.config.email + ':' + this.config.apiToken).toString('base64'), 'Accept': 'application/json' } });
        if (!response.ok)
            throw new Error('API error: ' + response.status);
        const json = await response.json();
        return json.issues || [];
    }
    async findTicketByJiraKey(jiraKey) {
        if (this.jiraKeyMap.has(jiraKey))
            return this.jiraKeyMap.get(jiraKey);
        const tickets = await this.graphStore.getNodes({ type: 'ticket', jiraKey });
        if (tickets.length > 0) {
            this.jiraKeyMap.set(jiraKey, tickets[0].id);
            return tickets[0].id;
        }
        return null;
    }
    async createTicketFromJira(issue) {
        const ticket = {
            id: crypto.randomUUID(), type: 'ticket', createdAt: new Date(issue.fields.created), updatedAt: new Date(issue.fields.updated),
            createdBy: 'jira-sync', title: issue.fields.summary, description: issue.fields.description || '',
            status: this.mapStatus(issue.fields.status.statusCategory.key), priority: this.mapPriority(issue.fields.priority.name), ticketType: 'unknown',
            estimate: issue.fields.customfield_10016, assignee: issue.fields.assignee?.displayName, labels: issue.fields.labels,
            dueDate: issue.fields.duedate ? new Date(issue.fields.duedate) : undefined, jiraKey: issue.key, sprintId: issue.fields.sprint?.id?.toString(),
            agentEligible: !['Highest', 'High'].includes(issue.fields.priority.name) && (issue.fields.customfield_10016 || 0) <= 3,
            complexity: this.mapComplexity(issue.fields.customfield_10016),
        };
        const created = await this.graphStore.createNode(ticket);
        this.jiraKeyMap.set(issue.key, created.id);
        return created;
    }
    async updateTicketFromJira(ticketId, issue) {
        await this.graphStore.updateNode(ticketId, {
            title: issue.fields.summary, description: issue.fields.description || '', status: this.mapStatus(issue.fields.status.statusCategory.key),
            priority: this.mapPriority(issue.fields.priority.name), estimate: issue.fields.customfield_10016,
            assignee: issue.fields.assignee?.displayName, labels: issue.fields.labels,
            dueDate: issue.fields.duedate ? new Date(issue.fields.duedate) : undefined,
        });
    }
    async createJiraIssue(ticket) {
        const url = 'https://' + this.config.host + '/rest/api/3/issue';
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': 'Basic ' + Buffer.from(this.config.email + ':' + this.config.apiToken).toString('base64'), 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { project: { key: this.config.projectKey }, summary: ticket.title, description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: ticket.description || '' }] }] }, issuetype: { name: 'Task' } } }),
        });
        const json = await response.json();
        return json.key;
    }
    async updateJiraIssue(ticket) {
        const url = 'https://' + this.config.host + '/rest/api/3/issue/' + ticket.jiraKey;
        await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': 'Basic ' + Buffer.from(this.config.email + ':' + this.config.apiToken).toString('base64'), 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { summary: ticket.title } }),
        });
    }
    mapStatus(cat) { return { 'new': 'backlog', 'indeterminate': 'in_progress', 'done': 'done' }[cat] || 'backlog'; }
    mapPriority(p) { return { 'Highest': 'P0', 'High': 'P1', 'Medium': 'P2', 'Low': 'P3', 'Lowest': 'P3' }[p] || 'P2'; }
    mapComplexity(e) { if (!e)
        return 'unknown'; if (e <= 1)
        return 'trivial'; if (e <= 2)
        return 'simple'; if (e <= 5)
        return 'medium'; return 'complex'; }
}
exports.JiraProjection = JiraProjection;
