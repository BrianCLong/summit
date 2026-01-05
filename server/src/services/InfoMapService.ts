import { logger, Logger } from '../utils/logger.js';

export interface InfoNode {
  id: string;
  label: string;
  type: 'media_outlet' | 'social_platform' | 'forum' | 'influencer';
  influenceScore: number;
  connections: string[]; // IDs of connected nodes
  metadata: Record<string, any>;
}

export class InfoMapService {
  private static instance: InfoMapService;
  private logger: Logger;
  private nodes: Map<string, InfoNode> = new Map();

  private constructor() {
    this.logger = logger.child({ service: 'InfoMapService' });
    // Initialize with some mock data for the visualization
    this.seedMockData();
  }

  public static getInstance(): InfoMapService {
    if (!InfoMapService.instance) {
      InfoMapService.instance = new InfoMapService();
    }
    return InfoMapService.instance;
  }

  private seedMockData() {
    this.logger.info('Seeding InfoMap mock data...');
    const types = ['media_outlet', 'social_platform', 'forum', 'influencer'] as const;

    for (let i = 1; i <= 1000; i++) {
      const id = `node-${i}`;
      this.nodes.set(id, {
        id,
        label: `Info Node ${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        influenceScore: Math.random() * 100,
        connections: [],
        metadata: {
          region: ['US', 'EU', 'APAC'][Math.floor(Math.random() * 3)],
          trustLevel: Math.random()
        }
      });
    }

    // Create random connections
    const nodeIds = Array.from(this.nodes.keys());
    this.nodes.forEach(node => {
      const numConnections = Math.floor(Math.random() * 5);
      for (let j = 0; j < numConnections; j++) {
        const targetId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
        if (targetId !== node.id && !node.connections.includes(targetId)) {
          node.connections.push(targetId);
        }
      }
    });
  }

  public async getNodes(): Promise<InfoNode[]> {
    return Array.from(this.nodes.values());
  }

  public async ingestNode(nodeData: Omit<InfoNode, 'influenceScore' | 'connections'>): Promise<InfoNode> {
    const id = nodeData.id || `node-${Date.now()}`;
    const newNode: InfoNode = {
      ...nodeData,
      id,
      influenceScore: 0, // Initial score
      connections: []
    };
    this.nodes.set(id, newNode);
    this.logger.info(`Ingested new info node: ${id}`);
    return newNode;
  }

  public async triggerRefresh(): Promise<{ status: string; count: number }> {
    this.logger.info('Triggering InfoMap refresh cycle...');
    // Simulate refresh logic
    return { status: 'completed', count: this.nodes.size };
  }
}
