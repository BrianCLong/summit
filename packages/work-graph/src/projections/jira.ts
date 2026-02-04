import type { Ticket } from '../schema/nodes.js';

export interface JiraConfig { host: string; email: string; apiToken: string; projectKey: string; }
export interface JiraIssue { id: string; key: string; fields: { summary: string; description: string | null; status: { name: string; statusCategory: { key: string } }; priority: { name: string }; assignee: { displayName: string } | null; labels: string[]; duedate: string | null; created: string; updated: string; issuetype: { name: string }; customfield_10016?: number; parent?: { key: string }; sprint?: { name: string; id: number }; }; }
export interface SyncResult { created: number; updated: number; errors: string[]; }
export interface GraphStore { getNode<T>(id: string): Promise<T | null>; getNodes<T>(filter?: Partial<T>): Promise<T[]>; createNode<T>(node: T): Promise<T>; updateNode<T>(id: string, updates: Partial<T>): Promise<T | null>; }

export class JiraProjection {
  private jiraKeyMap: Map<string, string> = new Map();

  constructor(private config: JiraConfig, private graphStore: GraphStore) {}

  async syncFromJira(): Promise<SyncResult> {
    const result: SyncResult = { created: 0, updated: 0, errors: [] };
    try {
      const issues = await this.fetchIssues();
      for (const issue of issues) {
        try {
          const existing = await this.findTicketByJiraKey(issue.key);
          if (existing) { await this.updateTicketFromJira(existing, issue); result.updated++; }
          else { await this.createTicketFromJira(issue); result.created++; }
        } catch (e) { result.errors.push(issue.key + ': ' + e); }
      }
    } catch (e) { result.errors.push('Fetch failed: ' + e); }
    return result;
  }

  async pushToJira(ticketId: string): Promise<string | null> {
    const ticket = await this.graphStore.getNode<Ticket>(ticketId);
    if (!ticket) return null;
    if (ticket.jiraKey) { await this.updateJiraIssue(ticket); return ticket.jiraKey; }
    const jiraKey = await this.createJiraIssue(ticket);
    await this.graphStore.updateNode(ticketId, { jiraKey });
    return jiraKey;
  }

  private async fetchIssues(): Promise<JiraIssue[]> {
    const jql = 'project = ' + this.config.projectKey + ' ORDER BY updated DESC';
    const url = 'https://' + this.config.host + '/rest/api/3/search?jql=' + encodeURIComponent(jql) + '&maxResults=100';
    const response = await fetch(url, { headers: { 'Authorization': 'Basic ' + Buffer.from(this.config.email + ':' + this.config.apiToken).toString('base64'), 'Accept': 'application/json' } });
    if (!response.ok) throw new Error('API error: ' + response.status);
    const json = await response.json();
    return json.issues || [];
  }

  private async findTicketByJiraKey(jiraKey: string): Promise<string | null> {
    if (this.jiraKeyMap.has(jiraKey)) return this.jiraKeyMap.get(jiraKey)!;
    const tickets = await this.graphStore.getNodes<Ticket>({ type: 'ticket', jiraKey } as Partial<Ticket>);
    if (tickets.length > 0) { this.jiraKeyMap.set(jiraKey, tickets[0].id); return tickets[0].id; }
    return null;
  }

  private async createTicketFromJira(issue: JiraIssue): Promise<Ticket> {
    const ticket: Ticket = {
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

  private async updateTicketFromJira(ticketId: string, issue: JiraIssue): Promise<void> {
    await this.graphStore.updateNode<Ticket>(ticketId, {
      title: issue.fields.summary, description: issue.fields.description || '', status: this.mapStatus(issue.fields.status.statusCategory.key),
      priority: this.mapPriority(issue.fields.priority.name), estimate: issue.fields.customfield_10016,
      assignee: issue.fields.assignee?.displayName, labels: issue.fields.labels,
      dueDate: issue.fields.duedate ? new Date(issue.fields.duedate) : undefined,
    });
  }

  private async createJiraIssue(ticket: Ticket): Promise<string> {
    const url = 'https://' + this.config.host + '/rest/api/3/issue';
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + Buffer.from(this.config.email + ':' + this.config.apiToken).toString('base64'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { project: { key: this.config.projectKey }, summary: ticket.title, description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: ticket.description || '' }] }] }, issuetype: { name: 'Task' } } }),
    });
    const json = await response.json();
    return json.key;
  }

  private async updateJiraIssue(ticket: Ticket): Promise<void> {
    const url = 'https://' + this.config.host + '/rest/api/3/issue/' + ticket.jiraKey;
    await fetch(url, {
      method: 'PUT',
      headers: { 'Authorization': 'Basic ' + Buffer.from(this.config.email + ':' + this.config.apiToken).toString('base64'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { summary: ticket.title } }),
    });
  }

  private mapStatus(cat: string): Ticket['status'] { return ({ 'new': 'backlog', 'indeterminate': 'in_progress', 'done': 'done' } as Record<string, Ticket['status']>)[cat] || 'backlog'; }
  private mapPriority(p: string): Ticket['priority'] { return ({ 'Highest': 'P0', 'High': 'P1', 'Medium': 'P2', 'Low': 'P3', 'Lowest': 'P3' } as Record<string, Ticket['priority']>)[p] || 'P2'; }
  private mapComplexity(e?: number): Ticket['complexity'] { if (!e) return 'unknown'; if (e <= 1) return 'trivial'; if (e <= 2) return 'simple'; if (e <= 5) return 'medium'; return 'complex'; }
}
