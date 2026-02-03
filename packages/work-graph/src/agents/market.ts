import type { Ticket, Agent } from '../schema/nodes.js';

export interface WorkContract {
  id: string;
  ticketId: string;
  title: string;
  description: string;
  requirements: string[];
  acceptanceCriteria: string[];
  maxBidTime: Date;
  status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  winner?: string;
  publishedAt: Date;
  complexity: string;
  estimatedHours: number;
  priority: string;
}

export interface WorkBid {
  id: string;
  contractId: string;
  agentId: string;
  estimatedHours: number;
  estimatedQuality: number;
  confidence: number;
  approach: string;
  toolsUsed: string[];
  cost: number;
  costUnit: 'tokens' | 'credits' | 'points';
  riskFactors: string[];
  canStartAt: Date;
  estimatedCompletion: Date;
  submittedAt: Date;
}

export interface BidEvaluation {
  bidId: string;
  score: number;
  factors: { timeScore: number; qualityScore: number; reputationScore: number; costScore: number };
  selected: boolean;
  reason?: string;
}

export interface MarketConfig {
  minBidders: number;
  maxBidTime: number;
  qualityWeight: number;
  timeWeight: number;
  costWeight: number;
  reputationWeight: number;
}

export interface GraphStore {
  getNode<T>(id: string): Promise<T | null>;
  getNodes<T>(filter?: Partial<T>): Promise<T[]>;
  createNode<T>(node: T): Promise<T>;
  updateNode<T>(id: string, updates: Partial<T>): Promise<T | null>;
}

export class WorkMarket {
  private contracts: Map<string, WorkContract> = new Map();
  private bids: Map<string, WorkBid[]> = new Map();
  private config: MarketConfig;
  private graphStore: GraphStore;

  constructor(graphStore: GraphStore, config: Partial<MarketConfig> = {}) {
    this.graphStore = graphStore;
    this.config = { minBidders: 1, maxBidTime: 3600000, qualityWeight: 0.3, timeWeight: 0.3, costWeight: 0.2, reputationWeight: 0.2, ...config };
  }

  async publishContract(ticket: Ticket, options?: { maxBidTime?: number }): Promise<WorkContract> {
    const contract: WorkContract = {
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

  async submitBid(bid: Omit<WorkBid, 'id' | 'submittedAt'>): Promise<WorkBid> {
    const contract = this.contracts.get(bid.contractId);
    if (!contract || contract.status !== 'open') throw new Error('Contract not available');
    const fullBid: WorkBid = { ...bid, id: crypto.randomUUID(), submittedAt: new Date() };
    const bids = this.bids.get(bid.contractId) || [];
    bids.push(fullBid);
    this.bids.set(bid.contractId, bids);
    return fullBid;
  }

  async evaluateBids(contractId: string): Promise<BidEvaluation[]> {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error('Contract not found');
    const contractBids = this.bids.get(contractId) || [];
    const evaluations: BidEvaluation[] = [];
    for (const bid of contractBids) {
      const agent = await this.graphStore.getNode<Agent>(bid.agentId);
      const rep = agent?.reputation || 50;
      const timeScore = 100 - (bid.estimatedHours / contract.estimatedHours) * 50;
      const score = timeScore * this.config.timeWeight + bid.estimatedQuality * this.config.qualityWeight + rep * this.config.reputationWeight + (100 - bid.cost / 10) * this.config.costWeight;
      evaluations.push({ bidId: bid.id, score: Math.round(score), factors: { timeScore, qualityScore: bid.estimatedQuality, reputationScore: rep, costScore: 100 - bid.cost / 10 }, selected: false });
    }
    evaluations.sort((a, b) => b.score - a.score);
    if (evaluations.length > 0) evaluations[0].selected = true;
    return evaluations;
  }

  async assignContract(contractId: string, agentId: string): Promise<WorkContract> {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error('Contract not found');
    contract.status = 'assigned';
    contract.winner = agentId;
    await this.graphStore.updateNode(contract.ticketId, { assignee: agentId, assigneeType: 'agent', status: 'in_progress' });
    await this.graphStore.updateNode<Agent>(agentId, { status: 'busy', currentTask: contract.ticketId });
    return contract;
  }

  async completeContract(contractId: string, success: boolean): Promise<WorkContract> {
    const contract = this.contracts.get(contractId);
    if (!contract || !contract.winner) throw new Error('Invalid contract');
    contract.status = success ? 'completed' : 'failed';
    await this.graphStore.updateNode(contract.ticketId, { status: success ? 'done' : 'backlog', completedAt: success ? new Date() : undefined });
    const agent = await this.graphStore.getNode<Agent>(contract.winner);
    if (agent) {
      const newTasks = agent.completedTasks + 1;
      const newRate = success ? (agent.successRate * agent.completedTasks + 100) / newTasks : (agent.successRate * agent.completedTasks) / newTasks;
      await this.graphStore.updateNode<Agent>(contract.winner, { status: 'available', currentTask: undefined, completedTasks: newTasks, successRate: newRate, reputation: success ? Math.min(100, agent.reputation + 2) : Math.max(0, agent.reputation - 5) });
    }
    return contract;
  }

  getOpenContracts(): WorkContract[] { return Array.from(this.contracts.values()).filter(c => c.status === 'open'); }
  getContractBids(contractId: string): WorkBid[] { return this.bids.get(contractId) || []; }
}
