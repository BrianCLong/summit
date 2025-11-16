// server/src/conductor/scheduling/idempotent-queue.ts

import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import logger from '../../config/logger.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';

interface QueueItem {
  id: string;
  tenantId: string;
  expert: string;
  payload: any;
  priority: number;
  idempotencyKey?: string;
  maxRetries: number;
  retryCount: number;
  poisonPillChecks: string[];
  createdAt: Date;
}

interface PoisonPillRule {
  name: string;
  check: (item: QueueItem) => boolean;
  action: 'quarantine' | 'drop' | 'retry_later';
}

export class IdempotentQueue {
  private redis: Redis;
  private queueName: string;
  private poisonPillRules: PoisonPillRule[];
  private dedupeWindowMs: number;

  constructor(queueName: string, dedupeWindowMs: number = 300000) {
    // 5 min default
    this.redis = new Redis(process.env.REDIS_URL);
    this.queueName = queueName;
    this.dedupeWindowMs = dedupeWindowMs;
    this.poisonPillRules = this.initializePoisonPillRules();
  }

  async connect(): Promise<void> {
    await this.redis.connect();
  }

  /**
   * Enqueue item with idempotency protection
   */
  async enqueue(
    item: Omit<QueueItem, 'id' | 'retryCount' | 'createdAt'>,
  ): Promise<{
    success: boolean;
    id?: string;
    duplicate?: boolean;
    quarantined?: boolean;
  }> {
    try {
      const queueItem: QueueItem = {
        ...item,
        id: randomUUID(),
        retryCount: 0,
        createdAt: new Date(),
      };

      // Check for duplicates using idempotency key
      if (item.idempotencyKey) {
        const dupCheck = await this.checkDuplicate(item.idempotencyKey);
        if (dupCheck) {
          prometheusConductorMetrics.recordOperationalEvent(
            'queue_duplicate_ignored',
            true,
          );
          return { success: true, duplicate: true, id: dupCheck };
        }
      }

      // Run poison pill checks
      const poisonCheck = await this.checkPoisonPill(queueItem);
      if (poisonCheck.quarantine) {
        await this.quarantineItem(queueItem, poisonCheck.reason);
        prometheusConductorMetrics.recordOperationalEvent(
          'queue_item_quarantined',
          false,
        );
        return { success: false, quarantined: true, id: queueItem.id };
      }

      // Add to queue with priority
      const score = this.calculateScore(queueItem);
      await this.redis.zAdd(`queue:${this.queueName}`, {
        score,
        value: JSON.stringify(queueItem),
      });

      // Set idempotency key with TTL
      if (item.idempotencyKey) {
        await this.redis.setEx(
          `idem:${this.queueName}:${item.idempotencyKey}`,
          Math.ceil(this.dedupeWindowMs / 1000),
          queueItem.id,
        );
      }

      // Update metrics
      prometheusConductorMetrics.recordOperationalMetric(
        'queue_depth',
        await this.getDepth(),
      );
      prometheusConductorMetrics.recordOperationalEvent(
        'queue_item_enqueued',
        true,
      );

      logger.debug('Item enqueued successfully', {
        queueName: this.queueName,
        itemId: queueItem.id,
        priority: queueItem.priority,
      });

      return { success: true, id: queueItem.id };
    } catch (error) {
      logger.error('Failed to enqueue item', {
        error: error.message,
        queueName: this.queueName,
      });
      prometheusConductorMetrics.recordOperationalEvent(
        'queue_enqueue_error',
        false,
      );
      return { success: false };
    }
  }

  /**
   * Dequeue item with lease semantics
   */
  async dequeue(
    workerId: string,
    leaseTimeSeconds: number = 300,
  ): Promise<QueueItem | null> {
    try {
      // Get highest priority item
      const items = await this.redis.zPopMax(`queue:${this.queueName}`, 1);
      if (!items.length) {
        return null;
      }

      const queueItem: QueueItem = JSON.parse(items[0].value);

      // Set processing lease
      await this.redis.setEx(
        `lease:${this.queueName}:${queueItem.id}`,
        leaseTimeSeconds,
        workerId,
      );

      // Track processing start
      prometheusConductorMetrics.recordOperationalEvent(
        'queue_item_dequeued',
        true,
      );
      prometheusConductorMetrics.recordOperationalMetric(
        'queue_depth',
        await this.getDepth(),
      );

      logger.debug('Item dequeued', {
        queueName: this.queueName,
        itemId: queueItem.id,
        workerId,
      });

      return queueItem;
    } catch (error) {
      logger.error('Failed to dequeue item', {
        error: error.message,
        queueName: this.queueName,
      });
      prometheusConductorMetrics.recordOperationalEvent(
        'queue_dequeue_error',
        false,
      );
      return null;
    }
  }

  /**
   * Complete item processing (removes lease)
   */
  async complete(itemId: string, workerId: string): Promise<boolean> {
    try {
      const leaseKey = `lease:${this.queueName}:${itemId}`;
      const currentLease = await this.redis.get(leaseKey);

      if (currentLease !== workerId) {
        logger.warn('Lease mismatch on completion', {
          itemId,
          workerId,
          currentLease,
        });
        return false;
      }

      await this.redis.del(leaseKey);
      prometheusConductorMetrics.recordOperationalEvent(
        'queue_item_completed',
        true,
      );

      logger.debug('Item completed', {
        queueName: this.queueName,
        itemId,
        workerId,
      });
      return true;
    } catch (error) {
      logger.error('Failed to complete item', { error: error.message, itemId });
      return false;
    }
  }

  /**
   * Requeue item with retry logic
   */
  async requeue(item: QueueItem, error?: string): Promise<boolean> {
    try {
      item.retryCount++;

      if (item.retryCount >= item.maxRetries) {
        await this.quarantineItem(item, `max_retries_exceeded: ${error}`);
        return false;
      }

      // Exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, item.retryCount), 60000);
      const score = Date.now() + backoffMs;

      await this.redis.zAdd(`queue:${this.queueName}`, {
        score,
        value: JSON.stringify(item),
      });

      prometheusConductorMetrics.recordOperationalEvent(
        'queue_item_requeued',
        true,
      );
      logger.info('Item requeued with backoff', {
        itemId: item.id,
        retryCount: item.retryCount,
        backoffMs,
      });

      return true;
    } catch (error) {
      logger.error('Failed to requeue item', {
        error: error.message,
        itemId: item.id,
      });
      return false;
    }
  }

  /**
   * Get current queue depth
   */
  async getDepth(): Promise<number> {
    return await this.redis.zCard(`queue:${this.queueName}`);
  }

  /**
   * Get queue health metrics
   */
  async getHealthMetrics(): Promise<{
    depth: number;
    oldestItemAge: number;
    quarantinedCount: number;
    activeLeases: number;
  }> {
    try {
      const [depth, quarantinedCount, activeLeases] = await Promise.all([
        this.getDepth(),
        this.redis.lLen(`quarantine:${this.queueName}`),
        this.redis
          .keys(`lease:${this.queueName}:*`)
          .then((keys) => keys.length),
      ]);

      // Get oldest item age
      const oldestItems = await this.redis.zRangeWithScores(
        `queue:${this.queueName}`,
        0,
        0,
      );
      let oldestItemAge = 0;

      if (oldestItems.length > 0) {
        const oldestItem: QueueItem = JSON.parse(oldestItems[0].value);
        oldestItemAge = Date.now() - new Date(oldestItem.createdAt).getTime();
      }

      return { depth, oldestItemAge, quarantinedCount, activeLeases };
    } catch (error) {
      logger.error('Failed to get queue health metrics', {
        error: error.message,
      });
      return {
        depth: 0,
        oldestItemAge: 0,
        quarantinedCount: 0,
        activeLeases: 0,
      };
    }
  }

  private async checkDuplicate(idempotencyKey: string): Promise<string | null> {
    return await this.redis.get(`idem:${this.queueName}:${idempotencyKey}`);
  }

  private async checkPoisonPill(
    item: QueueItem,
  ): Promise<{ quarantine: boolean; reason?: string }> {
    for (const rule of this.poisonPillRules) {
      try {
        if (rule.check(item)) {
          const reason = `poison_pill_rule:${rule.name}`;

          if (rule.action === 'quarantine') {
            return { quarantine: true, reason };
          } else if (rule.action === 'drop') {
            logger.warn('Item dropped by poison pill rule', {
              itemId: item.id,
              rule: rule.name,
            });
            prometheusConductorMetrics.recordOperationalEvent(
              'queue_item_dropped',
              false,
            );
            return { quarantine: false };
          }
          // retry_later would need additional logic
        }
      } catch (error) {
        logger.error('Poison pill rule error', {
          rule: rule.name,
          error: error.message,
        });
      }
    }

    return { quarantine: false };
  }

  private async quarantineItem(item: QueueItem, reason: string): Promise<void> {
    const quarantineItem = {
      ...item,
      quarantineReason: reason,
      quarantinedAt: new Date().toISOString(),
    };

    await this.redis.lPush(
      `quarantine:${this.queueName}`,
      JSON.stringify(quarantineItem),
    );

    logger.warn('Item quarantined', {
      queueName: this.queueName,
      itemId: item.id,
      reason,
    });
  }

  private calculateScore(item: QueueItem): number {
    // Higher priority = lower score (for zRange ordering)
    const priorityScore =
      (10 - Math.min(9, Math.max(1, item.priority))) * 1000000;
    const timeScore = Date.now();
    return priorityScore + timeScore;
  }

  private initializePoisonPillRules(): PoisonPillRule[] {
    return [
      {
        name: 'payload_too_large',
        check: (item) => JSON.stringify(item.payload).length > 1024 * 1024, // 1MB
        action: 'quarantine',
      },
      {
        name: 'invalid_tenant',
        check: (item) => !item.tenantId || item.tenantId.length < 3,
        action: 'quarantine',
      },
      {
        name: 'unknown_expert',
        check: (item) =>
          !['graph_ops', 'rag_retrieval', 'osint_analysis'].includes(
            item.expert,
          ),
        action: 'quarantine',
      },
      {
        name: 'malformed_payload',
        check: (item) => {
          try {
            if (typeof item.payload !== 'object' || !item.payload.query) {
              return true;
            }
            return false;
          } catch {
            return true;
          }
        },
        action: 'quarantine',
      },
      {
        name: 'excessive_retries',
        check: (item) => item.retryCount > 10,
        action: 'drop',
      },
    ];
  }
}
