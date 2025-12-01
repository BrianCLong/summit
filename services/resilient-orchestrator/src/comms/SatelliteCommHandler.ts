/**
 * Satellite Communications Handler
 * Manages satellite link communications for denied/degraded environments
 * Supports store-and-forward, bandwidth optimization, and priority queuing
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuid } from 'uuid';
import { logger } from '../utils/logger.js';

export type LinkState = 'acquiring' | 'connected' | 'degraded' | 'lost' | 'scheduled';

export interface SatelliteLink {
  id: string;
  constellation: 'geo' | 'leo' | 'meo';
  linkState: LinkState;
  bandwidthKbps: number;
  latencyMs: number;
  packetLossPercent: number;
  nextWindow?: Date;
  windowDurationMinutes?: number;
}

export interface QueuedMessage {
  id: string;
  priority: 'flash' | 'immediate' | 'priority' | 'routine';
  payload: Buffer;
  destination: string;
  timestamp: Date;
  retries: number;
  maxRetries: number;
  expiresAt?: Date;
}

interface SatelliteEvents {
  'link:acquired': (link: SatelliteLink) => void;
  'link:lost': (linkId: string) => void;
  'link:degraded': (linkId: string, reason: string) => void;
  'message:sent': (messageId: string) => void;
  'message:failed': (messageId: string, reason: string) => void;
  'window:opening': (linkId: string, durationMinutes: number) => void;
  'window:closing': (linkId: string, remainingSeconds: number) => void;
}

export class SatelliteCommHandler extends EventEmitter<SatelliteEvents> {
  private links: Map<string, SatelliteLink> = new Map();
  private messageQueue: Map<string, QueuedMessage[]> = new Map(); // per priority
  private storeForwardBuffer: QueuedMessage[] = [];
  private windowTimers: Map<string, NodeJS.Timeout> = new Map();

  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly MAX_STORE_FORWARD_SIZE = 5000;
  private readonly FLASH_PRIORITY_BANDWIDTH_PERCENT = 0.4;
  private readonly IMMEDIATE_PRIORITY_BANDWIDTH_PERCENT = 0.3;

  constructor() {
    super();
    this.initializeQueues();
  }

  private initializeQueues(): void {
    this.messageQueue.set('flash', []);
    this.messageQueue.set('immediate', []);
    this.messageQueue.set('priority', []);
    this.messageQueue.set('routine', []);
  }

  /**
   * Register a satellite link
   */
  registerLink(link: Omit<SatelliteLink, 'id'>): SatelliteLink {
    const fullLink: SatelliteLink = {
      ...link,
      id: uuid(),
    };

    this.links.set(fullLink.id, fullLink);

    if (link.linkState === 'connected') {
      this.emit('link:acquired', fullLink);
      this.startTransmission(fullLink.id);
    }

    if (link.nextWindow) {
      this.scheduleWindow(fullLink);
    }

    logger.info('Satellite link registered', {
      linkId: fullLink.id,
      constellation: fullLink.constellation,
      state: fullLink.linkState,
    });

    return fullLink;
  }

  /**
   * Update link state
   */
  updateLinkState(linkId: string, state: LinkState, metrics?: Partial<SatelliteLink>): void {
    const link = this.links.get(linkId);
    if (!link) return;

    const previousState = link.linkState;
    link.linkState = state;

    if (metrics) {
      Object.assign(link, metrics);
    }

    if (state === 'connected' && previousState !== 'connected') {
      this.emit('link:acquired', link);
      this.startTransmission(linkId);
      this.drainStoreForwardBuffer(linkId);
    } else if (state === 'lost' && previousState !== 'lost') {
      this.emit('link:lost', linkId);
      this.stopTransmission(linkId);
    } else if (state === 'degraded') {
      this.emit('link:degraded', linkId, 'Link quality degraded');
    }
  }

  /**
   * Queue a message for transmission
   */
  queueMessage(
    priority: QueuedMessage['priority'],
    payload: Buffer,
    destination: string,
    ttlSeconds?: number
  ): string {
    const message: QueuedMessage = {
      id: uuid(),
      priority,
      payload,
      destination,
      timestamp: new Date(),
      retries: 0,
      maxRetries: priority === 'flash' ? 10 : priority === 'immediate' ? 5 : 3,
      expiresAt: ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : undefined,
    };

    const queue = this.messageQueue.get(priority);
    if (queue && queue.length < this.MAX_QUEUE_SIZE) {
      queue.push(message);
      this.processQueues();
      return message.id;
    }

    // Queue full - store for later if not flash priority
    if (priority !== 'flash' && this.storeForwardBuffer.length < this.MAX_STORE_FORWARD_SIZE) {
      this.storeForwardBuffer.push(message);
      logger.warn('Message added to store-forward buffer', { messageId: message.id });
      return message.id;
    }

    logger.error('Message rejected - queues full', { priority, destination });
    throw new Error('Message queue full');
  }

  /**
   * Get best available link for transmission
   */
  getBestLink(): SatelliteLink | null {
    let bestLink: SatelliteLink | null = null;
    let bestScore = -1;

    for (const link of this.links.values()) {
      if (link.linkState !== 'connected') continue;

      // Score based on bandwidth, latency, and packet loss
      const score =
        link.bandwidthKbps / 100 -
        link.latencyMs / 1000 -
        link.packetLossPercent * 10;

      if (score > bestScore) {
        bestScore = score;
        bestLink = link;
      }
    }

    return bestLink;
  }

  /**
   * Get available bandwidth across all connected links
   */
  getTotalBandwidth(): number {
    let total = 0;
    for (const link of this.links.values()) {
      if (link.linkState === 'connected') {
        total += link.bandwidthKbps;
      }
    }
    return total;
  }

  /**
   * Check if any link is available
   */
  hasConnectivity(): boolean {
    for (const link of this.links.values()) {
      if (link.linkState === 'connected' || link.linkState === 'degraded') {
        return true;
      }
    }
    return false;
  }

  /**
   * Get next scheduled communication window
   */
  getNextWindow(): { linkId: string; time: Date; durationMinutes: number } | null {
    let earliest: { linkId: string; time: Date; durationMinutes: number } | null = null;

    for (const link of this.links.values()) {
      if (link.linkState === 'scheduled' && link.nextWindow) {
        if (!earliest || link.nextWindow < earliest.time) {
          earliest = {
            linkId: link.id,
            time: link.nextWindow,
            durationMinutes: link.windowDurationMinutes ?? 15,
          };
        }
      }
    }

    return earliest;
  }

  private scheduleWindow(link: SatelliteLink): void {
    if (!link.nextWindow) return;

    const msUntilWindow = link.nextWindow.getTime() - Date.now();
    if (msUntilWindow <= 0) return;

    // Clear existing timer
    const existing = this.windowTimers.get(link.id);
    if (existing) clearTimeout(existing);

    // Schedule window opening
    const timer = setTimeout(() => {
      this.updateLinkState(link.id, 'connected');
      this.emit('window:opening', link.id, link.windowDurationMinutes ?? 15);

      // Schedule window closing
      const closingTimer = setTimeout(() => {
        this.emit('window:closing', link.id, 60);

        setTimeout(() => {
          this.updateLinkState(link.id, 'scheduled');
        }, 60000);
      }, ((link.windowDurationMinutes ?? 15) - 1) * 60000);

      this.windowTimers.set(`${link.id}-close`, closingTimer);
    }, msUntilWindow);

    this.windowTimers.set(link.id, timer);
  }

  private async processQueues(): Promise<void> {
    const link = this.getBestLink();
    if (!link) return;

    const bandwidth = link.bandwidthKbps * 1024 / 8; // bytes per second

    // Allocate bandwidth by priority
    await this.transmitFromQueue('flash', bandwidth * this.FLASH_PRIORITY_BANDWIDTH_PERCENT, link);
    await this.transmitFromQueue('immediate', bandwidth * this.IMMEDIATE_PRIORITY_BANDWIDTH_PERCENT, link);
    await this.transmitFromQueue('priority', bandwidth * 0.2, link);
    await this.transmitFromQueue('routine', bandwidth * 0.1, link);
  }

  private async transmitFromQueue(
    priority: string,
    availableBytes: number,
    link: SatelliteLink
  ): Promise<void> {
    const queue = this.messageQueue.get(priority);
    if (!queue || queue.length === 0) return;

    let bytesUsed = 0;
    const toRemove: string[] = [];

    for (const message of queue) {
      // Check expiration
      if (message.expiresAt && new Date() > message.expiresAt) {
        toRemove.push(message.id);
        this.emit('message:failed', message.id, 'Message expired');
        continue;
      }

      // Check if we have bandwidth
      if (bytesUsed + message.payload.length > availableBytes) break;

      // Simulate transmission
      const success = await this.transmitMessage(message, link);
      if (success) {
        toRemove.push(message.id);
        bytesUsed += message.payload.length;
        this.emit('message:sent', message.id);
      } else {
        message.retries++;
        if (message.retries >= message.maxRetries) {
          toRemove.push(message.id);
          this.emit('message:failed', message.id, 'Max retries exceeded');
        }
      }
    }

    // Remove processed messages
    for (const id of toRemove) {
      const idx = queue.findIndex(m => m.id === id);
      if (idx >= 0) queue.splice(idx, 1);
    }
  }

  private async transmitMessage(message: QueuedMessage, link: SatelliteLink): Promise<boolean> {
    // Simulate packet loss
    if (Math.random() * 100 < link.packetLossPercent) {
      return false;
    }

    // Simulate transmission delay
    const transmitTime = (message.payload.length / (link.bandwidthKbps * 128)) * 1000;
    await new Promise(resolve => setTimeout(resolve, transmitTime + link.latencyMs));

    return true;
  }

  private drainStoreForwardBuffer(linkId: string): void {
    logger.info('Draining store-forward buffer', { count: this.storeForwardBuffer.length });

    for (const message of this.storeForwardBuffer) {
      const queue = this.messageQueue.get(message.priority);
      if (queue && queue.length < this.MAX_QUEUE_SIZE) {
        queue.push(message);
      }
    }

    this.storeForwardBuffer = [];
    this.processQueues();
  }

  private transmissionIntervals: Map<string, NodeJS.Timeout> = new Map();

  private startTransmission(linkId: string): void {
    if (this.transmissionIntervals.has(linkId)) return;

    const interval = setInterval(() => {
      this.processQueues();
    }, 1000);

    this.transmissionIntervals.set(linkId, interval);
  }

  private stopTransmission(linkId: string): void {
    const interval = this.transmissionIntervals.get(linkId);
    if (interval) {
      clearInterval(interval);
      this.transmissionIntervals.delete(linkId);
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): Record<string, { count: number; oldestTimestamp?: Date }> {
    const stats: Record<string, { count: number; oldestTimestamp?: Date }> = {};

    for (const [priority, queue] of this.messageQueue) {
      stats[priority] = {
        count: queue.length,
        oldestTimestamp: queue[0]?.timestamp,
      };
    }

    stats['store-forward'] = {
      count: this.storeForwardBuffer.length,
      oldestTimestamp: this.storeForwardBuffer[0]?.timestamp,
    };

    return stats;
  }

  dispose(): void {
    for (const timer of this.windowTimers.values()) {
      clearTimeout(timer);
    }
    for (const interval of this.transmissionIntervals.values()) {
      clearInterval(interval);
    }
    this.windowTimers.clear();
    this.transmissionIntervals.clear();
    this.removeAllListeners();
  }
}
