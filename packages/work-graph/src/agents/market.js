"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkMarket = void 0;
class WorkMarket {
    contracts = new Map();
    bids = new Map();
    config;
    graphStore;
    constructor(graphStore, config = {}) {
        this.graphStore = graphStore;
        this.config = { minBidders: 1, maxBidTime: 3600000, qualityWeight: 0.3, timeWeight: 0.3, costWeight: 0.2, reputationWeight: 0.2, ...config };
    }
    async publishContract(ticket, options) {
        const contract = {
            id: crypto.randomUUID(), ticketId: ticket.id, title: ticket.title, description: ticket.description,
            requirements: [], acceptanceCriteria: ['Code passes tests', 'PR passes CI'],
            maxBidTime: new Date(Date.now() + (options?.maxBidTime || this.config.maxBidTime)),
            status: 'open', publishedAt: new Date(), complexity: ticket.complexity,
            estimatedHours: ticket.estimate || 3, priority: ticket.priority,
        };
        this.contracts.set(contract.id, contract);
        this.bids.set(contract.id, []);
        return contract;
    }
    async submitBid(bid) {
        const contract = this.contracts.get(bid.contractId);
        if (!contract || contract.status !== 'open')
            throw new Error('Contract not available');
        const fullBid = { ...bid, id: crypto.randomUUID(), submittedAt: new Date() };
        const bids = this.bids.get(bid.contractId) || [];
        bids.push(fullBid);
        this.bids.set(bid.contractId, bids);
        return fullBid;
    }
    async evaluateBids(contractId) {
        const contract = this.contracts.get(contractId);
        if (!contract)
            throw new Error('Contract not found');
        const contractBids = this.bids.get(contractId) || [];
        const evaluations = [];
        for (const bid of contractBids) {
            const agent = await this.graphStore.getNode(bid.agentId);
            const rep = agent?.reputation || 50;
            const timeScore = 100 - (bid.estimatedHours / contract.estimatedHours) * 50;
            const score = timeScore * this.config.timeWeight + bid.estimatedQuality * this.config.qualityWeight + rep * this.config.reputationWeight + (100 - bid.cost / 10) * this.config.costWeight;
            evaluations.push({ bidId: bid.id, score: Math.round(score), factors: { timeScore, qualityScore: bid.estimatedQuality, reputationScore: rep, costScore: 100 - bid.cost / 10 }, selected: false });
        }
        evaluations.sort((a, b) => b.score - a.score);
        if (evaluations.length > 0)
            evaluations[0].selected = true;
        return evaluations;
    }
    async assignContract(contractId, agentId) {
        const contract = this.contracts.get(contractId);
        if (!contract)
            throw new Error('Contract not found');
        contract.status = 'assigned';
        contract.winner = agentId;
        await this.graphStore.updateNode(contract.ticketId, { assignee: agentId, assigneeType: 'agent', status: 'in_progress' });
        await this.graphStore.updateNode(agentId, { status: 'busy', currentTask: contract.ticketId });
        return contract;
    }
    async completeContract(contractId, success) {
        const contract = this.contracts.get(contractId);
        if (!contract || !contract.winner)
            throw new Error('Invalid contract');
        contract.status = success ? 'completed' : 'failed';
        await this.graphStore.updateNode(contract.ticketId, { status: success ? 'done' : 'backlog', completedAt: success ? new Date() : undefined });
        const agent = await this.graphStore.getNode(contract.winner);
        if (agent) {
            const newTasks = agent.completedTasks + 1;
            const newRate = success ? (agent.successRate * agent.completedTasks + 100) / newTasks : (agent.successRate * agent.completedTasks) / newTasks;
            await this.graphStore.updateNode(contract.winner, { status: 'available', currentTask: undefined, completedTasks: newTasks, successRate: newRate, reputation: success ? Math.min(100, agent.reputation + 2) : Math.max(0, agent.reputation - 5) });
        }
        return contract;
    }
    getOpenContracts() { return Array.from(this.contracts.values()).filter(c => c.status === 'open'); }
    getContractBids(contractId) { return this.bids.get(contractId) || []; }
}
exports.WorkMarket = WorkMarket;
