/**
 * Summit Work Graph - GitHub Integration
 */

import type { PR, Ticket, Environment } from '../schema/nodes.js';
import type { WorkGraphEdge } from '../schema/edges.js';
import { EventBus } from '../events/bus.js';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  webhookSecret?: string;
}

export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  merged: boolean;
  draft: boolean;
  user: { login: string };
  head: { ref: string; sha: string };
  base: { ref: string };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  additions: number;
  deletions: number;
  changed_files: number;
  requested_reviewers: Array<{ login: string }>;
  labels: Array<{ name: string }>;
}

export interface SyncResult {
  prsCreated: number;
  prsUpdated: number;
  edgesCreated: number;
  errors: string[];
}

export interface GraphStore {
  getNode<T>(id: string): Promise<T | null>;
  getNodes<T>(filter?: Partial<T>): Promise<T[]>;
  createNode<T>(node: T): Promise<T>;
  updateNode<T>(id: string, updates: Partial<T>): Promise<T | null>;
  createEdge(edge: Partial<WorkGraphEdge>): Promise<WorkGraphEdge>;
  getEdges(filter?: { sourceId?: string; targetId?: string; type?: string }): Promise<WorkGraphEdge[]>;
}

export class GitHubIntegration {
  private config: GitHubConfig;
  private graphStore: GraphStore;
  private eventBus: EventBus;
  private prMap: Map<number, string> = new Map();

  constructor(config: GitHubConfig, graphStore: GraphStore, eventBus: EventBus) {
    this.config = config;
    this.graphStore = graphStore;
    this.eventBus = eventBus;
  }

  async syncPRs(): Promise<SyncResult> {
    const result: SyncResult = { prsCreated: 0, prsUpdated: 0, edgesCreated: 0, errors: [] };

    try {
      const prs = await this.fetchOpenPRs();
      for (const ghPR of prs) {
        try {
          const existing = await this.findPRNode(ghPR.number);
          if (existing) {
            await this.updatePRNode(existing, ghPR);
            result.prsUpdated++;
          } else {
            const node = await this.createPRNode(ghPR);
            result.prsCreated++;
            const ticketId = this.extractTicketId(ghPR);
            if (ticketId) {
              await this.linkPRToTicket(node.id, ticketId);
              result.edgesCreated++;
            }
          }
        } catch (error) {
          result.errors.push(`PR #${ghPR.number}: ${error}`);
        }
      }
    } catch (error) {
      result.errors.push(`Fetch failed: ${error}`);
    }

    return result;
  }

  async createPRNode(ghPR: GitHubPR): Promise<PR> {
    const checksStatus = await this.getChecksStatus(ghPR.head.sha);
    const prNode: Omit<PR, 'id' | 'createdAt' | 'updatedAt'> = {
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

    return created as PR;
  }

  async updatePRNode(nodeId: string, ghPR: GitHubPR): Promise<void> {
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

  async linkPRToTicket(prId: string, ticketIdentifier: string): Promise<void> {
    const tickets = await this.graphStore.getNodes<Ticket>({ type: 'ticket' } as Partial<Ticket>);
    const ticket = tickets.find(t => t.linearId === ticketIdentifier || t.jiraKey === ticketIdentifier);
    if (!ticket) return;

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

  async trackDeployment(environment: 'dev' | 'staging' | 'production' | 'canary', version: string, prNumbers: number[]): Promise<void> {
    const envNodes = await this.graphStore.getNodes<Environment>({ type: 'environment', name: environment } as Partial<Environment>);
    let envNode: Environment;

    if (envNodes.length > 0) {
      envNode = await this.graphStore.updateNode(envNodes[0].id, { version, deployedAt: new Date(), health: 'healthy' }) as Environment;
    } else {
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
      }) as Environment;
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

  private async fetchOpenPRs(): Promise<GitHubPR[]> {
    const response = await fetch(`https://api.github.com/repos/${this.config.owner}/${this.config.repo}/pulls?state=open`, {
      headers: { Authorization: `Bearer ${this.config.token}`, Accept: 'application/vnd.github.v3+json' },
    });
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
    return response.json();
  }

  private async getChecksStatus(sha: string): Promise<'pending' | 'passing' | 'failing'> {
    try {
      const response = await fetch(`https://api.github.com/repos/${this.config.owner}/${this.config.repo}/commits/${sha}/check-runs`, {
        headers: { Authorization: `Bearer ${this.config.token}`, Accept: 'application/vnd.github.v3+json' },
      });
      if (!response.ok) return 'pending';
      const data = await response.json();
      if (data.check_runs.length === 0) return 'pending';
      if (data.check_runs.some((c: { conclusion: string }) => c.conclusion === 'failure')) return 'failing';
      if (data.check_runs.every((c: { conclusion: string }) => c.conclusion === 'success')) return 'passing';
      return 'pending';
    } catch {
      return 'pending';
    }
  }

  private async findPRNode(prNumber: number): Promise<string | null> {
    if (this.prMap.has(prNumber)) return this.prMap.get(prNumber)!;
    const prs = await this.graphStore.getNodes<PR>({ type: 'pr', number: prNumber } as Partial<PR>);
    if (prs.length > 0) {
      this.prMap.set(prNumber, prs[0].id);
      return prs[0].id;
    }
    return null;
  }

  private mapPRStatus(ghPR: GitHubPR): PR['status'] {
    if (ghPR.merged) return 'merged';
    if (ghPR.state === 'closed') return 'closed';
    if (ghPR.draft) return 'draft';
    return 'open';
  }

  private isAgentAuthor(login: string): boolean {
    return ['bot', 'agent', 'claude', 'copilot', 'dependabot'].some(p => login.toLowerCase().includes(p));
  }

  private extractTicketId(ghPR: GitHubPR): string | null {
    const patterns = [ghPR.head.ref, ghPR.title, ghPR.body || ''];
    for (const text of patterns) {
      const match = text.match(/(SUMMIT-\d+|[A-Z]+-\d+)/i);
      if (match) return match[1].toUpperCase();
    }
    return null;
  }
}
