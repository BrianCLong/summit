/**
 * Summit Work Graph - B2A Work Market
 */

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
  factors: {
    timeScore: number;
    qualityScore: number;
    reputationScore: number;
    costScore: number;
  };
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

const DEFAULT_CONFIG: MarketConfig = {
  minBidders: 1,
  maxBidTime: 3600000, // 1 hour
  qualityWeight: 0.3,
  timeWeight: 0.3,
  costWeight: 0.2,
  reputationWeight: 0.2,
};

export class WorkMarket {
  private contracts: Map<string, WorkContract> = new Map();
  private bids: Map<string, WorkBid[]> = new Map();
  private config: MarketConfig;
  private graphStore: GraphStore;

  constructor(graphStore: GraphStore, config: Partial<MarketConfig> = {}) {
    this.graphStore = graphStore;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async publishContract(ticket: Ticket, options?: { maxBidTime?: number }): Promise<WorkContract> {
    const contract: WorkContract = {
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

  async submitBid(bid: Omit<WorkBid, 'id' | 'submittedAt'>): Promise<WorkBid> {
    const contract = this.contracts.get(bid.contractId);
    if (!contract) throw new Error('Contract not found');
    if (contract.status !== 'open') throw new Error('Contract not open for bidding');
    if (new Date() > contract.maxBidTime) throw new Error('Bidding period has ended');

    const fullBid: WorkBid = {
      ...bid,
      id: crypto.randomUUID(),
      submittedAt: new Date(),
    };

    const contractBids = this.bids.get(bid.contractId) || [];
    contractBids.push(fullBid);
    this.bids.set(bid.contractId, contractBids);

    return fullBid;
  }

  async evaluateBids(contractId: string): Promise<BidEvaluation[]> {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error('Contract not found');

    const contractBids = this.bids.get(contractId) || [];
    if (contractBids.length < this.config.minBidders) {
      return [];
    }

    const evaluations: BidEvaluation[] = [];

    for (const bid of contractBids) {
      const agent = await this.graphStore.getNode<Agent>(bid.agentId);
      const reputation = agent?.reputation || 50;

      const timeScore = 100 - (bid.estimatedHours / contract.estimatedHours) * 50;
      const qualityScore = bid.estimatedQuality;
      const reputationScore = reputation;
      const costScore = 100 - (bid.cost / 1000) * 10;

      const totalScore =
        timeScore * this.config.timeWeight +
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

  async assignContract(contractId: string, agentId: string): Promise<WorkContract> {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error('Contract not found');

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
    await this.graphStore.updateNode<Agent>(agentId, {
      status: 'busy',
      currentTask: contract.ticketId,
    });

    return contract;
  }

  async completeContract(contractId: string, success: boolean): Promise<WorkContract> {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error('Contract not found');
    if (!contract.winner) throw new Error('Contract has no assigned agent');

    contract.status = success ? 'completed' : 'failed';
    this.contracts.set(contractId, contract);

    // Update ticket status
    await this.graphStore.updateNode(contract.ticketId, {
      status: success ? 'done' : 'backlog',
      completedAt: success ? new Date() : undefined,
    });

    // Update agent stats
    const agent = await this.graphStore.getNode<Agent>(contract.winner);
    if (agent) {
      const newTasks = agent.completedTasks + 1;
      const newRate = success
        ? (agent.successRate * agent.completedTasks + 100) / newTasks
        : (agent.successRate * agent.completedTasks) / newTasks;
      const newRep = success
        ? Math.min(100, agent.reputation + 2)
        : Math.max(0, agent.reputation - 5);

      await this.graphStore.updateNode<Agent>(contract.winner, {
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

  getOpenContracts(): WorkContract[] {
    return Array.from(this.contracts.values()).filter(c => c.status === 'open');
  }

  getContractBids(contractId: string): WorkBid[] {
    return this.bids.get(contractId) || [];
  }

  private extractRequirements(ticket: Ticket): string[] {
    const requirements: string[] = [];
    if (ticket.labels.includes('backend')) requirements.push('Backend development skills');
    if (ticket.labels.includes('frontend')) requirements.push('Frontend development skills');
    if (ticket.complexity === 'complex') requirements.push('Senior-level experience');
    if (ticket.priority === 'P0' || ticket.priority === 'P1') requirements.push('Fast turnaround capability');
    return requirements;
  }

  private extractAcceptanceCriteria(ticket: Ticket): string[] {
    return [
      'Code passes all existing tests',
      'New functionality is tested',
      'Code follows project conventions',
      'PR passes CI checks',
    ];
  }
}
