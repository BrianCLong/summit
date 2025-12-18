import { GossipProtocol } from '../agents/swarm/GossipProtocol.js';
import { ConsensusEngine } from '../agents/swarm/ConsensusEngine.js';
import logger from '../utils/logger.js';
import { randomUUID } from 'crypto';

export class SwarmIntelligenceService {
  private static instance: SwarmIntelligenceService;
  private gossip: GossipProtocol;
  private consensus: ConsensusEngine;
  private nodeId: string;

  private constructor() {
    this.nodeId = process.env.SWARM_NODE_ID || randomUUID();
    this.gossip = new GossipProtocol(this.nodeId);
    this.consensus = new ConsensusEngine(this.nodeId, this.gossip);
  }

  public static getInstance(): SwarmIntelligenceService {
    if (!SwarmIntelligenceService.instance) {
      SwarmIntelligenceService.instance = new SwarmIntelligenceService();
    }
    return SwarmIntelligenceService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.gossip.initialize();
      await this.consensus.initialize();
      logger.info(`SwarmIntelligenceService initialized with Node ID: ${this.nodeId}`);
    } catch (error) {
      logger.error('Failed to initialize SwarmIntelligenceService', error);
      throw error;
    }
  }

  async proposeAction(action: string, params: any): Promise<string> {
    logger.info(`Swarm proposing action: ${action}`);
    return this.consensus.propose(action, params);
  }

  async shutdown(): Promise<void> {
    await this.gossip.shutdown();
  }

  getNodeId(): string {
    return this.nodeId;
  }
}
