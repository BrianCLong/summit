// @ts-nocheck
import { getIO } from '../realtime/socket.js';
import pino from 'pino';
import { randomUUID } from 'crypto';

const logger = pino();

export interface IntelligenceItem {
  id: string;
  timestamp: number;
  source: string;
  type: 'social' | 'darkweb' | 'news' | 'signal';
  content: string;
  metadata: Record<string, any>;
  threatScore: number;
  targetId?: string;
}

export interface IntelligenceAlert {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  items: string[]; // IDs of related items
  status: 'active' | 'investigating' | 'resolved';
}

class IntelligenceMonitorService {
  private static instance: IntelligenceMonitorService;
  private activeTargets: Map<string, number> = new Map();
  private simulationInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  public static getInstance(): IntelligenceMonitorService {
    if (!IntelligenceMonitorService.instance) {
      IntelligenceMonitorService.instance = new IntelligenceMonitorService();
    }
    return IntelligenceMonitorService.instance;
  }

  public startMonitoring(targetId: string) {
    const currentCount = this.activeTargets.get(targetId) || 0;
    this.activeTargets.set(targetId, currentCount + 1);
    logger.info(`Started intelligence monitoring for target: ${targetId}. Subscribers: ${currentCount + 1}`);

    if (!this.isRunning) {
      this.startSimulation();
    }
  }

  public stopMonitoring(targetId: string) {
    const currentCount = this.activeTargets.get(targetId) || 0;
    if (currentCount <= 1) {
      this.activeTargets.delete(targetId);
      logger.info(`Stopped intelligence monitoring for target: ${targetId}. No more subscribers.`);
    } else {
      this.activeTargets.set(targetId, currentCount - 1);
      logger.info(`Decremented subscribers for target: ${targetId}. Remaining: ${currentCount - 1}`);
    }

    if (this.activeTargets.size === 0) {
      this.stopSimulation();
    }
  }

  private startSimulation() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('Starting intelligence simulation loop');

    this.simulationInterval = setInterval(() => {
      this.generateSimulatedData();
    }, 2000); // Generate data every 2 seconds
  }

  private stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isRunning = false;
    logger.info('Stopped intelligence simulation loop');
  }

  private generateSimulatedData() {
    const io = getIO();
    if (!io) return;

    if (this.activeTargets.size === 0) return;

    // Pick a random target
    const targets = Array.from(this.activeTargets.keys());
    const targetId = targets[Math.floor(Math.random() * targets.length)];

    // Generate Item
    const item: IntelligenceItem = {
      id: randomUUID(),
      timestamp: Date.now(),
      source: this.getRandomSource(),
      type: this.getRandomType(),
      content: this.getRandomContent(),
      metadata: {},
      threatScore: Math.random(),
      targetId,
    };

    // Emit item to specific target room
    io.of('/realtime').to(`intelligence:${targetId}`).emit('intelligence:item', item);

    // Also emit to a global feed if needed
    io.of('/realtime').to('intelligence:global').emit('intelligence:item', item);

    // Randomly generate alert
    if (item.threatScore > 0.8) {
      const alert: IntelligenceAlert = {
        id: randomUUID(),
        timestamp: Date.now(),
        severity: item.threatScore > 0.95 ? 'critical' : 'high',
        title: `High Threat Detected from ${item.source}`,
        description: `High threat score (${item.threatScore.toFixed(2)}) detected in ${item.type} feed containing keywords.`,
        items: [item.id],
        status: 'active',
      };
      io.of('/realtime').to(`intelligence:${targetId}`).emit('intelligence:alert', alert);
      io.of('/realtime').to('intelligence:global').emit('intelligence:alert', alert);
    }
  }

  private getRandomSource() {
    const sources = ['Twitter', 'Reddit', 'Telegram', 'DarkNet Forum', 'NewsAPI', 'Signal'];
    return sources[Math.floor(Math.random() * sources.length)];
  }

  private getRandomType(): IntelligenceItem['type'] {
    const types: IntelligenceItem['type'][] = ['social', 'darkweb', 'news', 'signal'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private getRandomContent() {
    const templates = [
      "Mention of target in compromised database leak.",
      "Suspicious activity detected near operational zone.",
      "Negative sentiment spike observed in social channels.",
      "New domain registered resembling target infrastructure.",
      "Credential dump released containing potential matches.",
      "Coordinated inauthentic behavior signatures detected.",
      "Unusual traffic patterns from high-risk geolocations.",
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
}

export const intelligenceMonitor = IntelligenceMonitorService.getInstance();
