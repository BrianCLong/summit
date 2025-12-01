/**
 * Failover Controller
 * Manages automatic failover between communication channels and nodes
 * Supports multi-path redundancy and graceful degradation
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuid } from 'uuid';
import type { Route, NetworkNode, CommChannel } from '../types.js';
import { NetworkTopologyManager } from '../routing/NetworkTopologyManager.js';
import { SatelliteCommHandler } from './SatelliteCommHandler.js';
import { logger } from '../utils/logger.js';

export type FailoverReason =
  | 'link-failure'
  | 'node-failure'
  | 'timeout'
  | 'congestion'
  | 'security-incident'
  | 'scheduled-maintenance';

export interface FailoverEvent {
  id: string;
  reason: FailoverReason;
  fromChannel: CommChannel;
  toChannel: CommChannel;
  affectedRoutes: string[];
  timestamp: Date;
  automatic: boolean;
  success: boolean;
}

export interface FailoverPolicy {
  id: string;
  name: string;
  triggerConditions: {
    maxLatencyMs: number;
    maxPacketLossPercent: number;
    maxConsecutiveFailures: number;
    timeoutMs: number;
  };
  channelPriority: CommChannel[];
  autoFailback: boolean;
  failbackDelayMs: number;
  notifyOnFailover: boolean;
}

interface FailoverEvents {
  'failover:initiated': (event: FailoverEvent) => void;
  'failover:completed': (event: FailoverEvent) => void;
  'failover:failed': (event: FailoverEvent, error: string) => void;
  'failback:initiated': (fromChannel: CommChannel, toChannel: CommChannel) => void;
  'failback:completed': (channel: CommChannel) => void;
  'channel:health-changed': (channel: CommChannel, healthy: boolean) => void;
}

export class FailoverController extends EventEmitter<FailoverEvents> {
  private topologyManager: NetworkTopologyManager;
  private satelliteHandler: SatelliteCommHandler;
  private policies: Map<string, FailoverPolicy> = new Map();
  private activeChannel: CommChannel = 'primary';
  private channelHealth: Map<CommChannel, boolean> = new Map();
  private consecutiveFailures: Map<CommChannel, number> = new Map();
  private failoverHistory: FailoverEvent[] = [];
  private failbackTimers: Map<CommChannel, NodeJS.Timeout> = new Map();

  private readonly MAX_HISTORY_SIZE = 100;

  constructor(topologyManager: NetworkTopologyManager, satelliteHandler: SatelliteCommHandler) {
    super();
    this.topologyManager = topologyManager;
    this.satelliteHandler = satelliteHandler;
    this.initializeChannelHealth();
    this.setupEventHandlers();
  }

  private initializeChannelHealth(): void {
    const channels: CommChannel[] = ['primary', 'secondary', 'satellite', 'mesh', 'store-forward'];
    for (const channel of channels) {
      this.channelHealth.set(channel, channel === 'primary');
      this.consecutiveFailures.set(channel, 0);
    }
  }

  private setupEventHandlers(): void {
    this.topologyManager.on('topology:degraded', (nodeIds) => {
      this.handleTopologyDegraded(nodeIds);
    });

    this.topologyManager.on('topology:recovered', (nodeIds) => {
      this.handleTopologyRecovered(nodeIds);
    });

    this.topologyManager.on('route:failed', (routeId, reason) => {
      this.handleRouteFailed(routeId, reason);
    });

    this.satelliteHandler.on('link:acquired', () => {
      this.setChannelHealth('satellite', true);
    });

    this.satelliteHandler.on('link:lost', () => {
      this.setChannelHealth('satellite', false);
    });
  }

  /**
   * Register a failover policy
   */
  registerPolicy(policy: Omit<FailoverPolicy, 'id'>): FailoverPolicy {
    const fullPolicy: FailoverPolicy = {
      ...policy,
      id: uuid(),
    };

    this.policies.set(fullPolicy.id, fullPolicy);
    logger.info('Failover policy registered', { policyId: fullPolicy.id, name: fullPolicy.name });
    return fullPolicy;
  }

  /**
   * Get the current active channel
   */
  getActiveChannel(): CommChannel {
    return this.activeChannel;
  }

  /**
   * Manually trigger failover to a specific channel
   */
  async manualFailover(toChannel: CommChannel, reason: string): Promise<FailoverEvent> {
    return this.executeFailover(this.activeChannel, toChannel, 'link-failure', false);
  }

  /**
   * Record a transmission failure for a channel
   */
  recordFailure(channel: CommChannel): void {
    const current = this.consecutiveFailures.get(channel) ?? 0;
    this.consecutiveFailures.set(channel, current + 1);

    // Check if we should trigger automatic failover
    const policy = this.getApplicablePolicy();
    if (policy && current + 1 >= policy.triggerConditions.maxConsecutiveFailures) {
      this.triggerAutomaticFailover(channel, 'link-failure');
    }
  }

  /**
   * Record a successful transmission
   */
  recordSuccess(channel: CommChannel): void {
    this.consecutiveFailures.set(channel, 0);
  }

  /**
   * Set channel health status
   */
  setChannelHealth(channel: CommChannel, healthy: boolean): void {
    const previousHealth = this.channelHealth.get(channel);
    this.channelHealth.set(channel, healthy);

    if (previousHealth !== healthy) {
      this.emit('channel:health-changed', channel, healthy);

      if (!healthy && channel === this.activeChannel) {
        this.triggerAutomaticFailover(channel, 'link-failure');
      } else if (healthy && channel !== this.activeChannel) {
        this.considerFailback(channel);
      }
    }
  }

  /**
   * Get health status of all channels
   */
  getChannelHealthStatus(): Map<CommChannel, boolean> {
    return new Map(this.channelHealth);
  }

  /**
   * Get the best available channel based on current conditions
   */
  getBestAvailableChannel(): CommChannel {
    const policy = this.getApplicablePolicy();
    const priorityList = policy?.channelPriority ?? ['primary', 'secondary', 'satellite', 'mesh', 'store-forward'];

    for (const channel of priorityList) {
      if (this.channelHealth.get(channel)) {
        return channel;
      }
    }

    // Fallback to store-forward if nothing else available
    return 'store-forward';
  }

  private getApplicablePolicy(): FailoverPolicy | undefined {
    // Return first policy for now - could be extended for context-based selection
    return this.policies.values().next().value;
  }

  private async triggerAutomaticFailover(
    fromChannel: CommChannel,
    reason: FailoverReason
  ): Promise<void> {
    const toChannel = this.getBestAvailableChannel();

    if (toChannel === fromChannel) {
      logger.warn('No alternative channel available for failover', { fromChannel });
      return;
    }

    try {
      await this.executeFailover(fromChannel, toChannel, reason, true);
    } catch (error) {
      logger.error('Automatic failover failed', { fromChannel, toChannel, error });
    }
  }

  private async executeFailover(
    fromChannel: CommChannel,
    toChannel: CommChannel,
    reason: FailoverReason,
    automatic: boolean
  ): Promise<FailoverEvent> {
    const event: FailoverEvent = {
      id: uuid(),
      reason,
      fromChannel,
      toChannel,
      affectedRoutes: this.getAffectedRoutes(fromChannel),
      timestamp: new Date(),
      automatic,
      success: false,
    };

    this.emit('failover:initiated', event);

    try {
      // Validate target channel is available
      if (!this.channelHealth.get(toChannel) && toChannel !== 'store-forward') {
        throw new Error(`Target channel ${toChannel} is not healthy`);
      }

      // Perform channel switch
      this.activeChannel = toChannel;
      event.success = true;

      // Reset failure counter for new channel
      this.consecutiveFailures.set(toChannel, 0);

      // Setup failback if policy allows
      const policy = this.getApplicablePolicy();
      if (policy?.autoFailback && this.isPrimaryChannel(fromChannel)) {
        this.scheduleFailback(fromChannel, policy.failbackDelayMs);
      }

      this.addToHistory(event);
      this.emit('failover:completed', event);

      logger.info('Failover completed', {
        eventId: event.id,
        from: fromChannel,
        to: toChannel,
        reason,
      });

      return event;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.emit('failover:failed', event, message);
      logger.error('Failover failed', { eventId: event.id, error: message });
      throw error;
    }
  }

  private getAffectedRoutes(channel: CommChannel): string[] {
    const { routes } = this.topologyManager.getTopologySnapshot();
    return routes.filter(r => r.channel === channel).map(r => r.id);
  }

  private isPrimaryChannel(channel: CommChannel): boolean {
    return channel === 'primary' || channel === 'secondary';
  }

  private scheduleFailback(toChannel: CommChannel, delayMs: number): void {
    // Clear existing failback timer
    const existing = this.failbackTimers.get(toChannel);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.attemptFailback(toChannel);
    }, delayMs);

    this.failbackTimers.set(toChannel, timer);
  }

  private async attemptFailback(toChannel: CommChannel): Promise<void> {
    if (!this.channelHealth.get(toChannel)) {
      logger.info('Failback delayed - channel not yet healthy', { channel: toChannel });
      // Reschedule
      this.scheduleFailback(toChannel, 30000);
      return;
    }

    this.emit('failback:initiated', this.activeChannel, toChannel);

    try {
      this.activeChannel = toChannel;
      this.emit('failback:completed', toChannel);
      logger.info('Failback completed', { channel: toChannel });
    } catch (error) {
      logger.error('Failback failed', { channel: toChannel, error });
    }
  }

  private considerFailback(recoveredChannel: CommChannel): void {
    const policy = this.getApplicablePolicy();
    if (!policy?.autoFailback) return;

    // Check if recovered channel is higher priority than current
    const priorityList = policy.channelPriority;
    const currentIndex = priorityList.indexOf(this.activeChannel);
    const recoveredIndex = priorityList.indexOf(recoveredChannel);

    if (recoveredIndex < currentIndex) {
      this.scheduleFailback(recoveredChannel, policy.failbackDelayMs);
    }
  }

  private handleTopologyDegraded(nodeIds: string[]): void {
    // Check if degradation affects current channel
    const { routes } = this.topologyManager.getTopologySnapshot();
    const affectedRoutes = routes.filter(r =>
      nodeIds.some(id => r.hops.includes(id) || r.source === id || r.destination === id)
    );

    if (affectedRoutes.length > 0) {
      this.triggerAutomaticFailover(this.activeChannel, 'node-failure');
    }
  }

  private handleTopologyRecovered(nodeIds: string[]): void {
    // Potentially trigger failback
    const policy = this.getApplicablePolicy();
    if (policy?.autoFailback) {
      this.setChannelHealth('primary', true);
    }
  }

  private handleRouteFailed(routeId: string, reason: string): void {
    this.recordFailure(this.activeChannel);
  }

  private addToHistory(event: FailoverEvent): void {
    this.failoverHistory.push(event);
    if (this.failoverHistory.length > this.MAX_HISTORY_SIZE) {
      this.failoverHistory.shift();
    }
  }

  /**
   * Get failover history
   */
  getFailoverHistory(limit?: number): FailoverEvent[] {
    const history = [...this.failoverHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get current resilience status
   */
  getResilienceStatus(): {
    activeChannel: CommChannel;
    healthyChannels: CommChannel[];
    failoverCount24h: number;
    lastFailover?: FailoverEvent;
  } {
    const healthyChannels: CommChannel[] = [];
    for (const [channel, healthy] of this.channelHealth) {
      if (healthy) healthyChannels.push(channel);
    }

    const now = Date.now();
    const failovers24h = this.failoverHistory.filter(
      e => now - e.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    return {
      activeChannel: this.activeChannel,
      healthyChannels,
      failoverCount24h: failovers24h.length,
      lastFailover: this.failoverHistory[this.failoverHistory.length - 1],
    };
  }

  dispose(): void {
    for (const timer of this.failbackTimers.values()) {
      clearTimeout(timer);
    }
    this.failbackTimers.clear();
    this.removeAllListeners();
  }
}
