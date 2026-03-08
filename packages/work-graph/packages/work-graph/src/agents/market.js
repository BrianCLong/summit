"use strict";
/**
 * Summit Work Graph - B2A Work Market
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkMarket = void 0;
const DEFAULT_CONFIG = {
    minBidders: 1,
    maxBidTime: 3600000, // 1 hour
    qualityWeight: 0.3,
    timeWeight: 0.3,
    costWeight: 0.2,
    reputationWeight: 0.2,
};
class WorkMarket {
    contracts = new Map();
    bids = new Map();
    config;
    graphStore;
    constructor(graphStore, config = {}) {
        this.graphStore = graphStore;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    async publishContract(ticket, options) {
        const contract = {
            id: crypto.randomUUID(),
            ticketId: ticket.id,
            title: ticket.title,
            description: ticket.description,
            requirements: this.extractRequirements(ticket),
            acceptanceCriteria: this.extractAcceptanceCriteria(ticket),
            maxBidTime: new Date(Date.now() + (options?.maxBidTime || this.config.maxBidTime)),
            status: 'open',
            publishedAt: new Date(),
            complexity: ticket.complexity,
            estimatedHours: ticket.estimate || 3,
            priority: ticket.priority,
        };
        this.contracts.set(contract.id, contract);
        this.bids.set(contract.id, []);
        return contract;
    }
    async submitBid(bid) {
        const contract = this.contracts.get(bid.contractId);
        if (!contract)
            throw new Error('Contract not found');
        if (contract.status !== 'open')
            throw new Error('Contract not open for bidding');
        if (new Date() > contract.maxBidTime)
            throw new Error('Bidding period has ended');
        const fullBid = {
            ...bid,
            id: crypto.randomUUID(),
            submittedAt: new Date(),
        };
        const contractBids = this.bids.get(bid.contractId) || [];
        contractBids.push(fullBid);
        this.bids.set(bid.contractId, contractBids);
        return fullBid;
    }
    async evaluateBids(contractId) {
        const contract = this.contracts.get(contractId);
        if (!contract)
            throw new Error('Contract not found');
        const contractBids = this.bids.get(contractId) || [];
        if (contractBids.length < this.config.minBidders) {
            return [];
        }
        const evaluations = [];
        for (const bid of contractBids) {
            const agent = await this.graphStore.getNode(bid.agentId);
            const reputation = agent?.reputation || 50;
            const timeScore = 100 - (bid.estimatedHours / contract.estimatedHours) * 50;
            const qualityScore = bid.estimatedQuality;
            const reputationScore = reputation;
            const costScore = 100 - (bid.cost / 1000) * 10;
            const totalScore = timeScore * this.config.timeWeight +
                qualityScore * this.config.qualityWeight +
                reputationScore * this.config.reputationWeight +
                costScore * this.config.costWeight;
            evaluations.push({
                bidId: bid.id,
                score: Math.round(totalScore),
                factors: { timeScore, qualityScore, reputationScore, costScore },
                selected: false,
            });
        }
        // Sort by score and select winner
        evaluations.sort((a, b) => b.score - a.score);
        if (evaluations.length > 0) {
            evaluations[0].selected = true;
            evaluations[0].reason = 'Highest overall score';
        }
        return evaluations;
    }
    async assignContract(contractId, agentId) {
        const contract = this.contracts.get(contractId);
        if (!contract)
            throw new Error('Contract not found');
        contract.status = 'assigned';
        contract.winner = agentId;
        this.contracts.set(contractId, contract);
        // Update ticket assignment
        await this.graphStore.updateNode(contract.ticketId, {
            assignee: agentId,
            assigneeType: 'agent',
            status: 'in_progress',
        });
        // Update agent status
        await this.graphStore.updateNode(agentId, {
            status: 'busy',
            currentTask: contract.ticketId,
        });
        return contract;
    }
    async completeContract(contractId, success) {
        const contract = this.contracts.get(contractId);
        if (!contract)
            throw new Error('Contract not found');
        if (!contract.winner)
            throw new Error('Contract has no assigned agent');
        contract.status = success ? 'completed' : 'failed';
        this.contracts.set(contractId, contract);
        // Update ticket status
        await this.graphStore.updateNode(contract.ticketId, {
            status: success ? 'done' : 'backlog',
            completedAt: success ? new Date() : undefined,
        });
        // Update agent stats
        const agent = await this.graphStore.getNode(contract.winner);
        if (agent) {
            const newTasks = agent.completedTasks + 1;
            const newRate = success
                ? (agent.successRate * agent.completedTasks + 100) / newTasks
                : (agent.successRate * agent.completedTasks) / newTasks;
            const newRep = success
                ? Math.min(100, agent.reputation + 2)
                : Math.max(0, agent.reputation - 5);
            await this.graphStore.updateNode(contract.winner, {
                status: 'available',
                currentTask: undefined,
                completedTasks: newTasks,
                successRate: newRate,
                reputation: newRep,
                lastActive: new Date(),
            });
        }
        return contract;
    }
    getOpenContracts() {
        return Array.from(this.contracts.values()).filter(c => c.status === 'open');
    }
    getContractBids(contractId) {
        return this.bids.get(contractId) || [];
    }
    extractRequirements(ticket) {
        const requirements = [];
        if (ticket.labels.includes('backend'))
            requirements.push('Backend development skills');
        if (ticket.labels.includes('frontend'))
            requirements.push('Frontend development skills');
        if (ticket.complexity === 'complex')
            requirements.push('Senior-level experience');
        if (ticket.priority === 'P0' || ticket.priority === 'P1')
            requirements.push('Fast turnaround capability');
        return requirements;
    }
    extractAcceptanceCriteria(ticket) {
        return [
            'Code passes all existing tests',
            'New functionality is tested',
            'Code follows project conventions',
            'PR passes CI checks',
        ];
    }
}
exports.WorkMarket = WorkMarket;
