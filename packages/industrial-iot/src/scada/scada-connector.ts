/**
 * SCADA Connector
 * Integration with SCADA (Supervisory Control and Data Acquisition) systems
 */

import { EventEmitter } from 'eventemitter3';
import pino from 'pino';

const logger = pino({ name: 'scada-connector' });

export interface SCADATag {
  id: string;
  name: string;
  type: 'analog' | 'digital' | 'string';
  value: number | boolean | string;
  quality: 'good' | 'bad' | 'uncertain';
  timestamp: Date;
  unit?: string;
  alarmState?: 'normal' | 'warning' | 'alarm' | 'critical';
}

export interface SCADASystem {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'modbus' | 'opc-ua' | 'dnp3' | 'iec-104';
  connected: boolean;
}

export class SCADAConnector extends EventEmitter {
  private systems = new Map<string, SCADASystem>();
  private tags = new Map<string, SCADATag>();
  private subscriptions = new Map<string, Set<(tag: SCADATag) => void>>();

  /**
   * Register SCADA system
   */
  registerSystem(system: SCADASystem): void {
    this.systems.set(system.id, system);
    logger.info({ systemId: system.id, name: system.name, protocol: system.protocol }, 'SCADA system registered');
  }

  /**
   * Connect to SCADA system
   */
  async connect(systemId: string): Promise<void> {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`SCADA system ${systemId} not found`);
    }

    logger.info({ systemId, host: system.host, protocol: system.protocol }, 'Connecting to SCADA system');

    // Simulate connection (real implementation would use actual SCADA protocols)
    system.connected = true;

    this.emit('system:connected', system);

    logger.info({ systemId }, 'Connected to SCADA system');
  }

  /**
   * Disconnect from SCADA system
   */
  async disconnect(systemId: string): Promise<void> {
    const system = this.systems.get(systemId);
    if (system) {
      system.connected = false;
      this.emit('system:disconnected', system);
      logger.info({ systemId }, 'Disconnected from SCADA system');
    }
  }

  /**
   * Read tag value
   */
  async readTag(systemId: string, tagId: string): Promise<SCADATag> {
    const system = this.systems.get(systemId);
    if (!system || !system.connected) {
      throw new Error(`SCADA system ${systemId} not connected`);
    }

    const tag = this.tags.get(tagId);
    if (!tag) {
      throw new Error(`Tag ${tagId} not found`);
    }

    logger.debug({ systemId, tagId }, 'Reading SCADA tag');

    return tag;
  }

  /**
   * Write tag value
   */
  async writeTag(systemId: string, tagId: string, value: number | boolean | string): Promise<void> {
    const system = this.systems.get(systemId);
    if (!system || !system.connected) {
      throw new Error(`SCADA system ${systemId} not connected`);
    }

    let tag = this.tags.get(tagId);
    if (!tag) {
      throw new Error(`Tag ${tagId} not found`);
    }

    tag.value = value;
    tag.timestamp = new Date();

    logger.info({ systemId, tagId, value }, 'SCADA tag written');

    this.emit('tag:updated', tag);
    this.notifySubscribers(tagId, tag);
  }

  /**
   * Register tag
   */
  registerTag(tag: SCADATag): void {
    this.tags.set(tag.id, tag);
    logger.debug({ tagId: tag.id, name: tag.name, type: tag.type }, 'SCADA tag registered');
  }

  /**
   * Subscribe to tag updates
   */
  subscribeToTag(tagId: string, handler: (tag: SCADATag) => void): () => void {
    if (!this.subscriptions.has(tagId)) {
      this.subscriptions.set(tagId, new Set());
    }

    this.subscriptions.get(tagId)!.add(handler);

    logger.debug({ tagId }, 'Subscribed to SCADA tag');

    return () => {
      this.subscriptions.get(tagId)?.delete(handler);
    };
  }

  /**
   * Update tag value (internal, from polling/subscription)
   */
  updateTag(tagId: string, value: number | boolean | string, quality: SCADATag['quality'] = 'good'): void {
    const tag = this.tags.get(tagId);
    if (!tag) {
      return;
    }

    tag.value = value;
    tag.quality = quality;
    tag.timestamp = new Date();

    this.emit('tag:updated', tag);
    this.notifySubscribers(tagId, tag);
  }

  /**
   * Notify subscribers of tag update
   */
  private notifySubscribers(tagId: string, tag: SCADATag): void {
    const subscribers = this.subscriptions.get(tagId);
    if (subscribers) {
      for (const handler of subscribers) {
        try {
          handler(tag);
        } catch (error) {
          logger.error({ error, tagId }, 'Error in tag subscriber');
        }
      }
    }
  }

  /**
   * Get all tags
   */
  getAllTags(): SCADATag[] {
    return Array.from(this.tags.values());
  }

  /**
   * Get tags in alarm state
   */
  getAlarmTags(): SCADATag[] {
    return Array.from(this.tags.values()).filter(
      (tag) => tag.alarmState && tag.alarmState !== 'normal'
    );
  }
}
