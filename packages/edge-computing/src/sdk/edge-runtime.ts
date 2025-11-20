/**
 * Edge Runtime
 * Runtime environment for edge device processing
 */

import { EventEmitter } from 'eventemitter3';
import pino from 'pino';
import { SensorReading } from '@intelgraph/sensor-data';

const logger = pino({ name: 'edge-runtime' });

export interface EdgeFunction {
  name: string;
  execute(data: any): Promise<any>;
}

export interface EdgeRule {
  id: string;
  name: string;
  condition: (reading: SensorReading) => boolean;
  action: (reading: SensorReading) => Promise<void>;
  enabled: boolean;
}

export class EdgeRuntime extends EventEmitter {
  private functions = new Map<string, EdgeFunction>();
  private rules = new Map<string, EdgeRule>();
  private cache = new Map<string, any>();
  private offlineQueue: SensorReading[] = [];
  private isOnline = true;

  /**
   * Register edge function
   */
  registerFunction(func: EdgeFunction): void {
    this.functions.set(func.name, func);
    logger.info({ function: func.name }, 'Edge function registered');
  }

  /**
   * Execute edge function
   */
  async executeFunction(name: string, data: any): Promise<any> {
    const func = this.functions.get(name);
    if (!func) {
      throw new Error(`Function ${name} not found`);
    }

    try {
      const result = await func.execute(data);
      logger.debug({ function: name }, 'Edge function executed');
      return result;
    } catch (error) {
      logger.error({ error, function: name }, 'Edge function execution failed');
      throw error;
    }
  }

  /**
   * Add processing rule
   */
  addRule(rule: EdgeRule): void {
    this.rules.set(rule.id, rule);
    logger.info({ ruleId: rule.id, name: rule.name }, 'Edge rule added');
  }

  /**
   * Process sensor reading through rules
   */
  async processReading(reading: SensorReading): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) {
        continue;
      }

      try {
        if (rule.condition(reading)) {
          await rule.action(reading);
          logger.debug({ ruleId: rule.id, reading }, 'Rule action executed');
        }
      } catch (error) {
        logger.error({ error, ruleId: rule.id }, 'Rule execution failed');
      }
    }
  }

  /**
   * Cache data locally
   */
  setCache(key: string, value: any, ttl?: number): void {
    this.cache.set(key, { value, expiresAt: ttl ? Date.now() + ttl : null });

    if (ttl) {
      setTimeout(() => this.cache.delete(key), ttl);
    }
  }

  /**
   * Get cached data
   */
  getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    if (cached.expiresAt && Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Queue data for offline sync
   */
  queueOffline(reading: SensorReading): void {
    this.offlineQueue.push(reading);
    logger.debug({ queueSize: this.offlineQueue.length }, 'Reading queued for offline sync');
  }

  /**
   * Set online/offline status
   */
  setOnlineStatus(online: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = online;

    if (wasOffline && online) {
      logger.info({ queuedReadings: this.offlineQueue.length }, 'Coming back online');
      this.emit('online', { queuedReadings: this.offlineQueue });
    } else if (!online) {
      logger.warn('Going offline');
      this.emit('offline');
    }
  }

  /**
   * Get offline queue
   */
  getOfflineQueue(): SensorReading[] {
    return [...this.offlineQueue];
  }

  /**
   * Clear offline queue
   */
  clearOfflineQueue(): void {
    const count = this.offlineQueue.length;
    this.offlineQueue = [];
    logger.info({ clearedCount: count }, 'Offline queue cleared');
  }

  /**
   * Get runtime statistics
   */
  getStats() {
    return {
      functions: this.functions.size,
      rules: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter((r) => r.enabled).length,
      cacheSize: this.cache.size,
      offlineQueueSize: this.offlineQueue.length,
      isOnline: this.isOnline,
    };
  }
}
