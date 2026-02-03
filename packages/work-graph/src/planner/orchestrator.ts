import type { Ticket, Epic, Intent, Commitment, Agent } from '../schema/nodes.js';
import type { WorkGraphEdge } from '../schema/edges.js';

export interface GraphStore {
  getNode<T>(id: string): Promise<T | null>;
  getNodes<T>(filter?: Partial<T>): Promise<T[]>;
  createNode<T>(node: T): Promise<T>;
  updateNode<T>(id: string, updates: Partial<T>): Promise<T | null>;
  createEdge(edge: WorkGraphEdge): Promise<WorkGraphEdge>;
  getEdges(filter?: { sourceId?: string; targetId?: string; type?: string }): Promise<WorkGraphEdge[]>;
}

export interface PlanSynthesisResult {
  tickets: Ticket[];
  edges: WorkGraphEdge[];
  criticalPath: string[];
  estimatedCompletion: Date;
  risks: Array<{ type: string; severity: string; description: string; mitigation?: string }>;
  confidence: number;
}

export interface ReplanTrigger {
  type: 'ticket_blocked' | 'commitment_at_risk' | 'capacity_change' | 'priority_change';
  sourceId: string;
  description: string;
  timestamp: Date;
}

export interface TaskExecutor {
  execute(connectorId: string, action: string, params: Record<string, unknown>, context: any): Promise<any>;
}

export class PlannerOrchestrator {
  constructor(private graphStore: GraphStore) {}

  async executePlan(plan: PlanSynthesisResult, executor: TaskExecutor, context: any): Promise<void> {
    // Topologically sort tickets (simple approximation: just run in order for now as edges define dep)
    // For MVP, we iterate through plan.tickets
    for (const ticket of plan.tickets) {
      if (ticket.status === 'done') continue;

      try {
        await this.graphStore.updateNode(ticket.id, { status: 'in_progress' });

        const toolCall = ticket.metadata?.toolCall as {
          connectorId: string;
          action: string;
          params: Record<string, unknown>;
        } | undefined;

        if (toolCall) {
          await executor.execute(toolCall.connectorId, toolCall.action, toolCall.params, context);
        } else {
            // Simulate work
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        await this.graphStore.updateNode(ticket.id, { status: 'done', completedAt: new Date() });
      } catch (error) {
        await this.graphStore.updateNode(ticket.id, {
            status: 'blocked',
            blockedReason: String(error)
        });
        // Trigger replan?
        // For now just stop or log
        throw error;
      }
    }
  }

  async synthesizePlan(intent: Intent, options?: { maxTickets?: number; targetDate?: Date }): Promise<PlanSynthesisResult> {
    const tickets: Ticket[] = [];
    const edges: WorkGraphEdge[] = [];
    const risks: PlanSynthesisResult['risks'] = [];

    const epicCount = Math.ceil(intent.description.length / 300);
    const ticketsPerEpic = Math.ceil((options?.maxTickets || 20) / epicCount);

    for (let i = 0; i < epicCount; i++) {
      const epic: Epic = await this.graphStore.createNode({
        id: crypto.randomUUID(), type: 'epic', createdAt: new Date(), updatedAt: new Date(),
        createdBy: 'planner', title: intent.title + ' - Phase ' + (i + 1),
        description: 'Auto-generated', status: 'planned', progress: 0,
      });

      for (let j = 0; j < ticketsPerEpic; j++) {
        // Mock a tool call for demonstration if description mentions "search" or "lookup"
        let metadata = {};
        if (intent.description.toLowerCase().includes('search') && j === 0) {
            metadata = {
                toolCall: {
                    connectorId: 'search-connector',
                    action: 'search',
                    params: { query: intent.title }
                }
            };
        }

        const ticket: Ticket = await this.graphStore.createNode({
          id: crypto.randomUUID(), type: 'ticket', createdAt: new Date(), updatedAt: new Date(),
          createdBy: 'planner', title: epic.title + ' - Task ' + (j + 1), description: 'Auto-generated',
          status: 'backlog', priority: 'P2', ticketType: 'feature', labels: ['auto-generated'], agentEligible: true, complexity: 'medium', estimate: 3,
          metadata
        });
        tickets.push(ticket);
        edges.push(await this.graphStore.createEdge({
          id: crypto.randomUUID(), type: 'implements', sourceId: ticket.id, targetId: epic.id,
          createdAt: new Date(), createdBy: 'planner', weight: 1,
        }));
        if (j > 0) {
          edges.push(await this.graphStore.createEdge({
            id: crypto.randomUUID(), type: 'depends_on', sourceId: ticket.id, targetId: tickets[tickets.length - 2].id,
            createdAt: new Date(), createdBy: 'planner', weight: 1,
          }));
        }
      }
    }

    const totalEstimate = tickets.reduce((sum, t) => sum + (t.estimate || 3), 0);
    const estimatedCompletion = new Date(Date.now() + totalEstimate * 8 * 60 * 60 * 1000);

    if (options?.targetDate && estimatedCompletion > options.targetDate) {
      risks.push({ type: 'deadline', severity: 'high', description: 'May miss target date', mitigation: 'Reduce scope' });
    }

    return { tickets, edges, criticalPath: tickets.map(t => t.id), estimatedCompletion, risks, confidence: Math.max(50, 100 - risks.length * 10) };
  }

  async replan(trigger: ReplanTrigger): Promise<PlanSynthesisResult | null> {
    const node = await this.graphStore.getNode(trigger.sourceId);
    if (!node) return null;
    const tickets = await this.graphStore.getNodes<Ticket>({ type: 'ticket' } as Partial<Ticket>);
    const edges = await this.graphStore.getEdges({});
    return { tickets, edges, criticalPath: tickets.map(t => t.id), estimatedCompletion: new Date(), risks: [], confidence: 70 };
  }

  async assignWork(): Promise<{ assignments: Array<{ ticketId: string; assigneeId: string }>; unassigned: string[] }> {
    const ready = await this.graphStore.getNodes<Ticket>({ type: 'ticket', status: 'ready' } as Partial<Ticket>);
    const agents = await this.graphStore.getNodes<Agent>({ type: 'agent', status: 'available' } as Partial<Agent>);
    const assignments: Array<{ ticketId: string; assigneeId: string }> = [];
    const unassigned: string[] = [];
    let idx = 0;
    for (const t of ready.sort((a, b) => (['P0','P1','P2','P3'].indexOf(a.priority) - ['P0','P1','P2','P3'].indexOf(b.priority)))) {
      if (t.agentEligible && agents.length > 0) {
        const agent = agents[idx % agents.length];
        assignments.push({ ticketId: t.id, assigneeId: agent.id });
        await this.graphStore.updateNode(t.id, { assignee: agent.id, assigneeType: 'agent' });
        idx++;
      } else unassigned.push(t.id);
    }
    return { assignments, unassigned };
  }

  async computeCommitmentConfidence(commitmentId: string): Promise<number> {
    const commitment = await this.graphStore.getNode<Commitment>(commitmentId);
    if (!commitment) return 0;
    const edges = await this.graphStore.getEdges({ targetId: commitmentId, type: 'drives' });
    const tickets = await Promise.all(edges.map(e => this.graphStore.getNode<Ticket>(e.sourceId)));
    const valid = tickets.filter((t): t is Ticket => t !== null);
    const done = valid.filter(t => t.status === 'done').length;
    const rate = valid.length > 0 ? done / valid.length : 0;
    const daysLeft = (commitment.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    const timeFactor = Math.max(0, Math.min(1, daysLeft / 14));
    return Math.round((rate * 0.7 + timeFactor * 0.3) * 100);
  }
}
