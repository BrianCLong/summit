/**
 * Summit Work Graph - Linear Projection
 */

import type { Ticket, Epic } from '../schema/nodes.js';
import type { WorkGraphEdge } from '../schema/edges.js';

export interface LinearConfig {
  apiKey: string;
  teamId: string;
  webhookUrl?: string;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description: string;
  state: { name: string; type: string };
  priority: number;
  estimate: number | null;
  assignee: { id: string; name: string } | null;
  labels: { nodes: Array<{ name: string }> };
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  cycle: { id: string; name: string } | null;
  parent: { id: string } | null;
}

export interface SyncResult {
  created: number;
  updated: number;
  errors: string[];
}

export interface GraphStore {
  getNode<T>(id: string): Promise<T | null>;
  getNodes<T>(filter?: Partial<T>): Promise<T[]>;
  createNode<T>(node: T): Promise<T>;
  updateNode<T>(id: string, updates: Partial<T>): Promise<T | null>;
  createEdge(edge: WorkGraphEdge): Promise<WorkGraphEdge>;
}

export class LinearProjection {
  private config: LinearConfig;
  private graphStore: GraphStore;
  private linearIdMap: Map<string, string> = new Map();

  constructor(config: LinearConfig, graphStore: GraphStore) {
    this.config = config;
    this.graphStore = graphStore;
  }

  async syncFromLinear(): Promise<SyncResult> {
    const result: SyncResult = { created: 0, updated: 0, errors: [] };

    try {
      const issues = await this.fetchIssues();

      for (const issue of issues) {
        try {
          const existing = await this.findTicketByLinearId(issue.id);

          if (existing) {
            await this.updateTicketFromLinear(existing, issue);
            result.updated++;
          } else {
            await this.createTicketFromLinear(issue);
            result.created++;
          }
        } catch (error) {
          result.errors.push('Issue ' + issue.identifier + ': ' + error);
        }
      }
    } catch (error) {
      result.errors.push('Fetch failed: ' + error);
    }

    return result;
  }

  async pushToLinear(ticketId: string): Promise<string | null> {
    const ticket = await this.graphStore.getNode<Ticket>(ticketId);
    if (!ticket) return null;

    if (ticket.linearId) {
      await this.updateLinearIssue(ticket);
      return ticket.linearId;
    } else {
      const linearId = await this.createLinearIssue(ticket);
      await this.graphStore.updateNode(ticketId, { linearId });
      return linearId;
    }
  }

  async handleWebhook(payload: { action: string; data: LinearIssue }): Promise<void> {
    const { action, data } = payload;

    if (action === 'create' || action === 'update') {
      const existing = await this.findTicketByLinearId(data.id);
      if (existing) {
        await this.updateTicketFromLinear(existing, data);
      } else {
        await this.createTicketFromLinear(data);
      }
    } else if (action === 'remove') {
      const existing = await this.findTicketByLinearId(data.id);
      if (existing) {
        await this.graphStore.updateNode(existing, { status: 'done' });
      }
    }
  }

  private async fetchIssues(): Promise<LinearIssue[]> {
    const query = 'query { issues(filter: { team: { id: { eq: "' + this.config.teamId + '" } } }) { nodes { id identifier title description state { name type } priority estimate assignee { id name } labels { nodes { name } } dueDate createdAt updatedAt cycle { id name } parent { id } } } }';

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.config.apiKey,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) throw new Error('Linear API error: ' + response.status);

    const json = await response.json();
    return json.data?.issues?.nodes || [];
  }

  private async findTicketByLinearId(linearId: string): Promise<string | null> {
    if (this.linearIdMap.has(linearId)) return this.linearIdMap.get(linearId)!;

    const tickets = await this.graphStore.getNodes<Ticket>({ type: 'ticket', linearId } as Partial<Ticket>);
    if (tickets.length > 0) {
      this.linearIdMap.set(linearId, tickets[0].id);
      return tickets[0].id;
    }
    return null;
  }

  private async createTicketFromLinear(issue: LinearIssue): Promise<Ticket> {
    const ticket: Ticket = {
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

  private async updateTicketFromLinear(ticketId: string, issue: LinearIssue): Promise<void> {
    await this.graphStore.updateNode<Ticket>(ticketId, {
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

  private async createLinearIssue(ticket: Ticket): Promise<string> {
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

  private async updateLinearIssue(ticket: Ticket): Promise<void> {
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

  private mapLinearStatus(stateType: string): Ticket['status'] {
    const mapping: Record<string, Ticket['status']> = {
      backlog: 'backlog',
      unstarted: 'ready',
      started: 'in_progress',
      completed: 'done',
      canceled: 'done',
    };
    return mapping[stateType] || 'backlog';
  }

  private mapLinearPriority(priority: number): Ticket['priority'] {
    if (priority === 1) return 'P0';
    if (priority === 2) return 'P1';
    if (priority === 3) return 'P2';
    return 'P3';
  }

  private reverseMapPriority(priority: Ticket['priority']): number {
    const mapping = { P0: 1, P1: 2, P2: 3, P3: 4 };
    return mapping[priority];
  }

  private isAgentEligible(issue: LinearIssue): boolean {
    const labels = issue.labels.nodes.map(l => l.name.toLowerCase());
    if (labels.includes('agent-eligible') || labels.includes('automate')) return true;
    if (issue.priority <= 2) return false; // P0/P1 need humans
    return issue.estimate !== null && issue.estimate <= 3;
  }

  private estimateComplexity(issue: LinearIssue): Ticket['complexity'] {
    if (!issue.estimate) return 'unknown';
    if (issue.estimate <= 1) return 'trivial';
    if (issue.estimate <= 2) return 'simple';
    if (issue.estimate <= 5) return 'medium';
    return 'complex';
  }
}
