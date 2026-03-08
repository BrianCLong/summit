"use strict";
/**
 * Summit Work Graph - Planner Orchestrator
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlannerOrchestrator = void 0;
class PlannerOrchestrator {
    graphStore;
    constructor(graphStore) {
        this.graphStore = graphStore;
    }
    async synthesizePlan(intent, options) {
        const tickets = [];
        const edges = [];
        const risks = [];
        // Decompose intent into epics based on scope
        const epicCount = this.estimateEpicCount(intent);
        const ticketsPerEpic = Math.ceil((options?.maxTickets || 20) / epicCount);
        for (let i = 0; i < epicCount; i++) {
            const epic = await this.createEpic(intent, i);
            // Create tickets for each epic
            for (let j = 0; j < ticketsPerEpic; j++) {
                const ticket = await this.createTicket(epic, j);
                tickets.push(ticket);
                // Create edge from ticket to epic
                edges.push(await this.createEdge('implements', ticket.id, epic.id));
                // Create dependencies between sequential tickets
                if (j > 0) {
                    edges.push(await this.createEdge('depends_on', ticket.id, tickets[tickets.length - 2].id));
                }
            }
        }
        // Compute critical path
        const criticalPath = this.computeCriticalPath(tickets, edges);
        // Estimate completion
        const totalEstimate = tickets.reduce((sum, t) => sum + (t.estimate || 3), 0);
        const estimatedCompletion = new Date(Date.now() + totalEstimate * 8 * 60 * 60 * 1000);
        // Identify risks
        if (options?.targetDate && estimatedCompletion > options.targetDate) {
            risks.push({
                type: 'deadline',
                severity: 'high',
                description: 'Estimated completion exceeds target date',
                mitigation: 'Consider reducing scope or adding capacity',
            });
        }
        const confidence = Math.max(50, 100 - risks.length * 10 - epicCount * 5);
        return { tickets, edges, criticalPath, estimatedCompletion, risks, confidence };
    }
    async replan(trigger) {
        const node = await this.graphStore.getNode(trigger.sourceId);
        if (!node)
            return null;
        // Find affected tickets
        const edges = await this.graphStore.getEdges({ sourceId: trigger.sourceId });
        const affectedTicketIds = edges.map(e => e.targetId);
        // Get all tickets in the plan
        const allTickets = await this.graphStore.getNodes({ type: 'ticket', status: 'backlog' });
        const affectedTickets = allTickets.filter(t => affectedTicketIds.includes(t.id));
        // Recalculate priorities based on trigger
        for (const ticket of affectedTickets) {
            if (trigger.type === 'commitment_at_risk') {
                await this.graphStore.updateNode(ticket.id, { priority: 'P1' });
            }
            else if (trigger.type === 'ticket_blocked') {
                await this.graphStore.updateNode(ticket.id, { status: 'blocked', blockedReason: trigger.description });
            }
        }
        // Return updated plan
        const updatedTickets = await this.graphStore.getNodes({ type: 'ticket' });
        const allEdges = await this.graphStore.getEdges({});
        return {
            tickets: updatedTickets,
            edges: allEdges,
            criticalPath: this.computeCriticalPath(updatedTickets, allEdges),
            estimatedCompletion: new Date(),
            risks: [],
            confidence: 70,
        };
    }
    async assignWork(capacity) {
        const readyTickets = await this.graphStore.getNodes({ type: 'ticket', status: 'ready' });
        const agents = await this.graphStore.getNodes({ type: 'agent', status: 'available' });
        const assignments = [];
        const unassigned = [];
        // Sort tickets by priority
        const sortedTickets = readyTickets.sort((a, b) => {
            const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
        let agentIndex = 0;
        for (const ticket of sortedTickets) {
            if (ticket.agentEligible && agents.length > 0) {
                const agent = agents[agentIndex % agents.length];
                assignments.push({ ticketId: ticket.id, assigneeId: agent.id });
                await this.graphStore.updateNode(ticket.id, { assignee: agent.id, assigneeType: 'agent' });
                agentIndex++;
            }
            else {
                unassigned.push(ticket.id);
            }
        }
        return { assignments, unassigned };
    }
    async computeCommitmentConfidence(commitmentId) {
        const commitment = await this.graphStore.getNode(commitmentId);
        if (!commitment)
            return 0;
        // Get linked tickets
        const edges = await this.graphStore.getEdges({ targetId: commitmentId, type: 'drives' });
        const ticketIds = edges.map(e => e.sourceId);
        const tickets = await Promise.all(ticketIds.map(id => this.graphStore.getNode(id)));
        // Calculate completion percentage
        const validTickets = tickets.filter((t) => t !== null);
        const completedCount = validTickets.filter(t => t.status === 'done').length;
        const completionRate = validTickets.length > 0 ? completedCount / validTickets.length : 0;
        // Factor in time remaining
        const daysRemaining = (commitment.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        const timePressure = Math.max(0, Math.min(1, daysRemaining / 14));
        // Calculate confidence
        return Math.round((completionRate * 0.7 + timePressure * 0.3) * 100);
    }
    estimateEpicCount(intent) {
        const descLength = intent.description.length;
        if (descLength < 200)
            return 1;
        if (descLength < 500)
            return 2;
        return 3;
    }
    async createEpic(intent, index) {
        const epic = {
            id: crypto.randomUUID(),
            type: 'epic',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'planner',
            title: intent.title + ' - Phase ' + (index + 1),
            description: 'Auto-generated epic for ' + intent.title,
            status: 'planned',
            progress: 0,
        };
        return this.graphStore.createNode(epic);
    }
    async createTicket(epic, index) {
        const ticket = {
            id: crypto.randomUUID(),
            type: 'ticket',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'planner',
            title: epic.title + ' - Task ' + (index + 1),
            description: 'Auto-generated ticket',
            status: 'backlog',
            priority: 'P2',
            labels: ['auto-generated'],
            agentEligible: true,
            complexity: 'medium',
            estimate: 3,
        };
        return this.graphStore.createNode(ticket);
    }
    async createEdge(type, sourceId, targetId) {
        const edge = {
            id: crypto.randomUUID(),
            type: type,
            sourceId,
            targetId,
            createdAt: new Date(),
            createdBy: 'planner',
            weight: 1,
        };
        return this.graphStore.createEdge(edge);
    }
    computeCriticalPath(tickets, edges) {
        // Simple critical path: longest dependency chain
        const dependencyEdges = edges.filter(e => e.type === 'depends_on');
        const graph = new Map();
        for (const ticket of tickets) {
            graph.set(ticket.id, []);
        }
        for (const edge of dependencyEdges) {
            const deps = graph.get(edge.sourceId) || [];
            deps.push(edge.targetId);
            graph.set(edge.sourceId, deps);
        }
        // Find longest path using DFS
        let longestPath = [];
        const dfs = (nodeId, path) => {
            path.push(nodeId);
            if (path.length > longestPath.length) {
                longestPath = [...path];
            }
            const deps = graph.get(nodeId) || [];
            for (const dep of deps) {
                dfs(dep, path);
            }
            path.pop();
        };
        for (const ticketId of graph.keys()) {
            dfs(ticketId, []);
        }
        return longestPath;
    }
}
exports.PlannerOrchestrator = PlannerOrchestrator;
