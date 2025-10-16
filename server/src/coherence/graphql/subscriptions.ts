import { PubSub } from 'graphql-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import { RedisService } from '../../cache/redis';
import logger from '../../utils/logger';

export interface CoherenceUpdate {
  tenantId: string;
  score: number;
  status: 'high' | 'medium' | 'low' | 'insufficient';
  signalCount: number;
  timestamp: string;
  changeType:
    | 'score_change'
    | 'status_change'
    | 'new_signal'
    | 'anomaly_detected';
  metadata?: Record<string, any>;
}

export interface ActivityUpdate {
  tenantId: string;
  activityId: string;
  fingerprint: any;
  timestamp: string;
  confidence: number;
  changeType: 'new_activity' | 'pattern_change' | 'anomaly';
}

export interface NarrativeUpdate {
  tenantId: string;
  narrativeId: string;
  impact: any;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
  changeType: 'narrative_shift' | 'impact_change' | 'new_narrative';
}

class CoherenceSubscriptionManager {
  private pubsub: PubSub;
  private redis: RedisService;
  private subscriptionCounts: Map<string, number> = new Map();

  constructor(redis: RedisService) {
    this.pubsub = new PubSub();
    this.redis = redis;
    this.setupRedisSubscriptions();
  }

  private setupRedisSubscriptions() {
    // Subscribe to Redis channels for cross-instance communication
    const subscriber = this.redis.getClient();

    subscriber.subscribe('coherence:updates');
    subscriber.subscribe('activity:updates');
    subscriber.subscribe('narrative:updates');

    subscriber.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);

        switch (channel) {
          case 'coherence:updates':
            this.pubsub.publish('COHERENCE_UPDATED', data);
            break;
          case 'activity:updates':
            this.pubsub.publish('ACTIVITY_UPDATED', data);
            break;
          case 'narrative:updates':
            this.pubsub.publish('NARRATIVE_UPDATED', data);
            break;
        }
      } catch (error) {
        logger.error('Failed to parse Redis subscription message', {
          error,
          channel,
          message: message.substring(0, 100),
        });
      }
    });
  }

  // Coherence score subscription
  coherenceUpdated() {
    return withFilter(
      () => this.pubsub.asyncIterator(['COHERENCE_UPDATED']),
      (payload: CoherenceUpdate, variables: { tenantId: string }) => {
        return payload.tenantId === variables.tenantId;
      },
    );
  }

  // Activity fingerprint subscription
  activityUpdated() {
    return withFilter(
      () => this.pubsub.asyncIterator(['ACTIVITY_UPDATED']),
      (
        payload: ActivityUpdate,
        variables: { tenantId: string; activityTypes?: string[] },
      ) => {
        if (payload.tenantId !== variables.tenantId) return false;

        if (variables.activityTypes?.length) {
          return variables.activityTypes.includes(payload.fingerprint.type);
        }

        return true;
      },
    );
  }

  // Narrative impact subscription
  narrativeUpdated() {
    return withFilter(
      () => this.pubsub.asyncIterator(['NARRATIVE_UPDATED']),
      (
        payload: NarrativeUpdate,
        variables: { tenantId: string; minSeverity?: string },
      ) => {
        if (payload.tenantId !== variables.tenantId) return false;

        if (variables.minSeverity) {
          const severityLevels = { low: 1, medium: 2, high: 3 };
          const payloadLevel = severityLevels[payload.severity];
          const minLevel =
            severityLevels[
              variables.minSeverity as keyof typeof severityLevels
            ];

          return payloadLevel >= minLevel;
        }

        return true;
      },
    );
  }

  // Combined intelligence feed
  intelligenceUpdated() {
    return withFilter(
      () =>
        this.pubsub.asyncIterator([
          'COHERENCE_UPDATED',
          'ACTIVITY_UPDATED',
          'NARRATIVE_UPDATED',
        ]),
      (
        payload: CoherenceUpdate | ActivityUpdate | NarrativeUpdate,
        variables: { tenantId: string },
      ) => {
        return payload.tenantId === variables.tenantId;
      },
    );
  }

  // Publish methods for triggering subscriptions
  async publishCoherenceUpdate(update: CoherenceUpdate) {
    try {
      // Publish locally
      await this.pubsub.publish('COHERENCE_UPDATED', update);

      // Publish to Redis for cross-instance communication
      await this.redis.publish('coherence:updates', JSON.stringify(update));

      logger.debug('Published coherence update', {
        tenantId: update.tenantId,
        changeType: update.changeType,
      });
    } catch (error) {
      logger.error('Failed to publish coherence update', { error, update });
    }
  }

  async publishActivityUpdate(update: ActivityUpdate) {
    try {
      await this.pubsub.publish('ACTIVITY_UPDATED', update);
      await this.redis.publish('activity:updates', JSON.stringify(update));

      logger.debug('Published activity update', {
        tenantId: update.tenantId,
        activityId: update.activityId,
        changeType: update.changeType,
      });
    } catch (error) {
      logger.error('Failed to publish activity update', { error, update });
    }
  }

  async publishNarrativeUpdate(update: NarrativeUpdate) {
    try {
      await this.pubsub.publish('NARRATIVE_UPDATED', update);
      await this.redis.publish('narrative:updates', JSON.stringify(update));

      logger.debug('Published narrative update', {
        tenantId: update.tenantId,
        narrativeId: update.narrativeId,
        changeType: update.changeType,
      });
    } catch (error) {
      logger.error('Failed to publish narrative update', { error, update });
    }
  }

  // Subscription lifecycle management
  async onSubscribe(subscriptionName: string, tenantId: string) {
    const key = `${subscriptionName}:${tenantId}`;
    const current = this.subscriptionCounts.get(key) || 0;
    this.subscriptionCounts.set(key, current + 1);

    logger.info('Subscription added', {
      subscriptionName,
      tenantId,
      count: current + 1,
    });

    // Store subscription in Redis for monitoring
    await this.redis.hincrby(`subscriptions:${tenantId}`, subscriptionName, 1);
  }

  async onUnsubscribe(subscriptionName: string, tenantId: string) {
    const key = `${subscriptionName}:${tenantId}`;
    const current = this.subscriptionCounts.get(key) || 0;
    const newCount = Math.max(0, current - 1);

    if (newCount === 0) {
      this.subscriptionCounts.delete(key);
    } else {
      this.subscriptionCounts.set(key, newCount);
    }

    logger.info('Subscription removed', {
      subscriptionName,
      tenantId,
      count: newCount,
    });

    // Update Redis
    if (newCount === 0) {
      await this.redis.hdel(`subscriptions:${tenantId}`, subscriptionName);
    } else {
      await this.redis.hincrby(
        `subscriptions:${tenantId}`,
        subscriptionName,
        -1,
      );
    }
  }

  // Health monitoring
  getSubscriptionCounts(): Record<string, number> {
    return Object.fromEntries(this.subscriptionCounts.entries());
  }

  async getActiveSubscriptionsForTenant(
    tenantId: string,
  ): Promise<Record<string, number>> {
    const result = await this.redis.hgetall(`subscriptions:${tenantId}`);
    const subscriptions: Record<string, number> = {};

    for (const [key, value] of Object.entries(result)) {
      subscriptions[key] = parseInt(value, 10) || 0;
    }

    return subscriptions;
  }

  // Utility methods for testing and monitoring
  async simulateCoherenceUpdate(
    tenantId: string,
    overrides: Partial<CoherenceUpdate> = {},
  ) {
    const update: CoherenceUpdate = {
      tenantId,
      score: Math.random(),
      status: 'medium',
      signalCount: Math.floor(Math.random() * 100),
      timestamp: new Date().toISOString(),
      changeType: 'score_change',
      metadata: { simulation: true },
      ...overrides,
    };

    await this.publishCoherenceUpdate(update);
    return update;
  }

  async simulateActivityUpdate(
    tenantId: string,
    overrides: Partial<ActivityUpdate> = {},
  ) {
    const update: ActivityUpdate = {
      tenantId,
      activityId: `activity_${Date.now()}`,
      fingerprint: {
        type: 'user_interaction',
        pattern: 'login_sequence',
        confidence: Math.random(),
      },
      timestamp: new Date().toISOString(),
      confidence: Math.random(),
      changeType: 'new_activity',
      ...overrides,
    };

    await this.publishActivityUpdate(update);
    return update;
  }

  async simulateNarrativeUpdate(
    tenantId: string,
    overrides: Partial<NarrativeUpdate> = {},
  ) {
    const severities: Array<'low' | 'medium' | 'high'> = [
      'low',
      'medium',
      'high',
    ];
    const update: NarrativeUpdate = {
      tenantId,
      narrativeId: `narrative_${Date.now()}`,
      impact: {
        type: 'information_flow',
        direction: 'upstream',
        magnitude: Math.random(),
      },
      timestamp: new Date().toISOString(),
      severity: severities[Math.floor(Math.random() * severities.length)],
      changeType: 'narrative_shift',
      ...overrides,
    };

    await this.publishNarrativeUpdate(update);
    return update;
  }
}

// GraphQL subscription resolvers
export const subscriptionResolvers = {
  Subscription: {
    coherenceUpdated: {
      subscribe: (parent: any, args: { tenantId: string }, context: any) => {
        context.subscriptionManager.onSubscribe(
          'coherenceUpdated',
          args.tenantId,
        );
        return context.subscriptionManager.coherenceUpdated();
      },
      resolve: (payload: CoherenceUpdate) => payload,
    },

    activityUpdated: {
      subscribe: (
        parent: any,
        args: { tenantId: string; activityTypes?: string[] },
        context: any,
      ) => {
        context.subscriptionManager.onSubscribe(
          'activityUpdated',
          args.tenantId,
        );
        return context.subscriptionManager.activityUpdated();
      },
      resolve: (payload: ActivityUpdate) => payload,
    },

    narrativeUpdated: {
      subscribe: (
        parent: any,
        args: { tenantId: string; minSeverity?: string },
        context: any,
      ) => {
        context.subscriptionManager.onSubscribe(
          'narrativeUpdated',
          args.tenantId,
        );
        return context.subscriptionManager.narrativeUpdated();
      },
      resolve: (payload: NarrativeUpdate) => payload,
    },

    intelligenceUpdated: {
      subscribe: (parent: any, args: { tenantId: string }, context: any) => {
        context.subscriptionManager.onSubscribe(
          'intelligenceUpdated',
          args.tenantId,
        );
        return context.subscriptionManager.intelligenceUpdated();
      },
      resolve: (
        payload: CoherenceUpdate | ActivityUpdate | NarrativeUpdate,
      ) => {
        // Transform different update types into a unified intelligence update format
        return {
          tenantId: payload.tenantId,
          timestamp: payload.timestamp,
          type: 'changeType' in payload ? payload.changeType : 'unknown',
          data: payload,
        };
      },
    },
  },
};

export { CoherenceSubscriptionManager };
