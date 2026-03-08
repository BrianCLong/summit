"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlannerOrchestrator = void 0;
class PlannerOrchestrator {
    graphStore;
    constructor(graphStore) {
        this.graphStore = graphStore;
    }
    async executePlan(plan, executor, context) {
        // Topologically sort tickets (simple approximation: just run in order for now as edges define dep)
        // For MVP, we iterate through plan.tickets
        for (const ticket of plan.tickets) {
            if (ticket.status === 'done')
                continue;
            try {
                await this.graphStore.updateNode(ticket.id, { status: 'in_progress' });
                const toolCall = ticket.metadata?.toolCall;
                if (toolCall) {
                    await executor.execute(toolCall.connectorId, toolCall.action, toolCall.params, context);
                }
                else {
                    // Simulate work
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                await this.graphStore.updateNode(ticket.id, { status: 'done', completedAt: new Date() });
            }
            catch (error) {
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
    async synthesizePlan(intent, options) {
        const tickets = [];
        const edges = [];
        const risks = [];
        const epicCount = Math.ceil(intent.description.length / 300);
        const ticketsPerEpic = Math.ceil((options?.maxTickets || 20) / epicCount);
        for (let i = 0; i < epicCount; i++) {
            const epic = await this.graphStore.createNode({
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
                const ticket = await this.graphStore.createNode({
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
    async replan(trigger) {
        const node = await this.graphStore.getNode(trigger.sourceId);
        if (!node)
            return null;
        const tickets = await this.graphStore.getNodes({ type: 'ticket' });
        const edges = await this.graphStore.getEdges({});
        return { tickets, edges, criticalPath: tickets.map(t => t.id), estimatedCompletion: new Date(), risks: [], confidence: 70 };
    }
    async assignWork() {
        const ready = await this.graphStore.getNodes({ type: 'ticket', status: 'ready' });
        const agents = await this.graphStore.getNodes({ type: 'agent', status: 'available' });
        const assignments = [];
        const unassigned = [];
        let idx = 0;
        for (const t of ready.sort((a, b) => (['P0', 'P1', 'P2', 'P3'].indexOf(a.priority) - ['P0', 'P1', 'P2', 'P3'].indexOf(b.priority)))) {
            if (t.agentEligible && agents.length > 0) {
                const agent = agents[idx % agents.length];
                assignments.push({ ticketId: t.id, assigneeId: agent.id });
                await this.graphStore.updateNode(t.id, { assignee: agent.id, assigneeType: 'agent' });
                idx++;
            }
            else
                unassigned.push(t.id);
        }
        return { assignments, unassigned };
    }
    async computeCommitmentConfidence(commitmentId) {
        const commitment = await this.graphStore.getNode(commitmentId);
        if (!commitment)
            return 0;
        const edges = await this.graphStore.getEdges({ targetId: commitmentId, type: 'drives' });
        const tickets = await Promise.all(edges.map(e => this.graphStore.getNode(e.sourceId)));
        const valid = tickets.filter((t) => t !== null);
        const done = valid.filter(t => t.status === 'done').length;
        const rate = valid.length > 0 ? done / valid.length : 0;
        const daysLeft = (commitment.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        const timeFactor = Math.max(0, Math.min(1, daysLeft / 14));
        return Math.round((rate * 0.7 + timeFactor * 0.3) * 100);
    }
}
exports.PlannerOrchestrator = PlannerOrchestrator;
