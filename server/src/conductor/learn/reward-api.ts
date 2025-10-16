// Reward API for Online Learning Router
// Collects feedback signals to improve expert routing decisions

import express from 'express';
import { adaptiveRouter, RewardSignal, ExpertArm } from './bandit';
import { prometheusConductorMetrics } from '../observability/prometheus';
import Redis from 'ioredis';

export const rewardRouter = express.Router();

interface RewardRequest {
  decisionId?: string;
  contextHash?: string;
  armId: ExpertArm;
  rewardType:
    | 'success_at_k'
    | 'human_thumbs'
    | 'incident_free'
    | 'accepted_insight'
    | 'implicit_feedback';
  rewardValue?: number; // 0-1, will be calculated if not provided
  metadata?: {
    latency?: number;
    cost?: number;
    userSatisfaction?: number;
    downstreamAcceptance?: boolean;
    k_position?: number;
    thumbs_direction?: 'up' | 'down';
    incident_occurred?: boolean;
    insight_accepted?: boolean;
    session_duration?: number;
    follow_up_queries?: number;
    error_occurred?: boolean;
  };
}

interface RewardResponse {
  success: boolean;
  rewardValue: number;
  message: string;
  processingTime: number;
}

/**
 * Reward calculation engine
 */
class RewardCalculator {
  /**
   * Calculate reward value from different signal types
   */
  static calculateReward(request: RewardRequest): number {
    if (request.rewardValue !== undefined) {
      return Math.max(0, Math.min(1, request.rewardValue));
    }

    switch (request.rewardType) {
      case 'success_at_k':
        return this.calculateSuccessAtK(request.metadata);

      case 'human_thumbs':
        return this.calculateHumanThumbs(request.metadata);

      case 'incident_free':
        return this.calculateIncidentFree(request.metadata);

      case 'accepted_insight':
        return this.calculateAcceptedInsight(request.metadata);

      case 'implicit_feedback':
        return this.calculateImplicitFeedback(request.metadata);

      default:
        return 0.5; // Neutral default
    }
  }

  private static calculateSuccessAtK(metadata: any = {}): number {
    const k = metadata.k_position || 1;
    const maxK = 10;

    // Higher reward for results found in top positions
    // k=1: reward=1.0, k=5: reward=0.6, k=10: reward=0.1
    return Math.max(0, (maxK - k + 1) / maxK);
  }

  private static calculateHumanThumbs(metadata: any = {}): number {
    if (metadata.thumbs_direction === 'up') {
      return 1.0;
    } else if (metadata.thumbs_direction === 'down') {
      return 0.0;
    }
    return 0.5; // No explicit feedback
  }

  private static calculateIncidentFree(metadata: any = {}): number {
    if (metadata.incident_occurred === true) {
      return 0.0; // Major penalty for incidents
    }

    // Consider error occurrence as partial penalty
    if (metadata.error_occurred === true) {
      return 0.3;
    }

    // Factor in latency and cost performance
    let reward = 1.0;

    if (metadata.latency) {
      // Penalty for high latency (>2s gets penalty)
      const latencyPenalty = Math.max(0, (metadata.latency - 2000) / 10000);
      reward -= Math.min(0.3, latencyPenalty);
    }

    if (metadata.cost) {
      // Penalty for high cost (>$0.01 gets penalty)
      const costPenalty = Math.max(0, (metadata.cost - 0.01) / 0.1);
      reward -= Math.min(0.2, costPenalty);
    }

    return Math.max(0.5, reward); // Minimum 0.5 for incident-free
  }

  private static calculateAcceptedInsight(metadata: any = {}): number {
    if (metadata.insight_accepted === true) {
      return 1.0;
    } else if (metadata.insight_accepted === false) {
      return 0.2; // Low reward for rejected insights
    }

    // Use downstream acceptance as proxy
    if (metadata.downstreamAcceptance === true) {
      return 0.8;
    } else if (metadata.downstreamAcceptance === false) {
      return 0.3;
    }

    return 0.5; // Unknown acceptance
  }

  private static calculateImplicitFeedback(metadata: any = {}): number {
    let reward = 0.5;

    // Session duration indicates engagement
    if (metadata.session_duration) {
      if (metadata.session_duration > 300) {
        // >5 minutes = good
        reward += 0.2;
      } else if (metadata.session_duration < 30) {
        // <30s = bad
        reward -= 0.3;
      }
    }

    // Follow-up queries indicate satisfaction/dissatisfaction
    if (metadata.follow_up_queries !== undefined) {
      if (metadata.follow_up_queries === 0) {
        reward += 0.3; // Got answer immediately
      } else if (metadata.follow_up_queries > 3) {
        reward -= 0.2; // Had to ask many times
      }
    }

    // User satisfaction score if available
    if (metadata.userSatisfaction !== undefined) {
      reward = 0.2 + metadata.userSatisfaction * 0.8; // Scale 0-1 to 0.2-1.0
    }

    return Math.max(0, Math.min(1, reward));
  }
}

/**
 * Submit reward signal
 */
rewardRouter.post('/reward', async (req, res) => {
  const startTime = Date.now();

  try {
    const rewardRequest: RewardRequest = req.body;

    // Validation
    if (!rewardRequest.armId) {
      return res.status(400).json({
        success: false,
        message: 'armId is required',
        processingTime: Date.now() - startTime,
      });
    }

    if (
      ![
        'success_at_k',
        'human_thumbs',
        'incident_free',
        'accepted_insight',
        'implicit_feedback',
      ].includes(rewardRequest.rewardType)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rewardType',
        processingTime: Date.now() - startTime,
      });
    }

    // Calculate reward value
    const rewardValue = RewardCalculator.calculateReward(rewardRequest);

    // Create reward signal
    const rewardSignal: RewardSignal = {
      armId: rewardRequest.armId,
      contextHash:
        rewardRequest.contextHash ||
        rewardRequest.decisionId ||
        `implicit_${Date.now()}`,
      rewardValue,
      rewardType: rewardRequest.rewardType,
      timestamp: Date.now(),
      metadata: rewardRequest.metadata,
    };

    // Process reward
    await adaptiveRouter.processReward(rewardSignal);

    const response: RewardResponse = {
      success: true,
      rewardValue,
      message: 'Reward processed successfully',
      processingTime: Date.now() - startTime,
    };

    // Record metrics
    prometheusConductorMetrics.recordOperationalEvent(
      `reward_${rewardRequest.rewardType}`,
      true,
    );
    prometheusConductorMetrics.recordOperationalMetric(
      'reward_processing_time',
      response.processingTime,
    );
    prometheusConductorMetrics.recordOperationalMetric(
      'reward_value',
      rewardValue,
    );

    res.json(response);
  } catch (error) {
    console.error('Reward processing error:', error);

    prometheusConductorMetrics.recordOperationalEvent(
      'reward_processing_error',
      false,
    );

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Submit batch rewards
 */
rewardRouter.post('/reward/batch', async (req, res) => {
  const startTime = Date.now();

  try {
    const rewards: RewardRequest[] = req.body.rewards;

    if (!Array.isArray(rewards) || rewards.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'rewards array is required and must not be empty',
        processingTime: Date.now() - startTime,
      });
    }

    if (rewards.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Batch size cannot exceed 100 rewards',
        processingTime: Date.now() - startTime,
      });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process rewards in parallel
    const processingPromises = rewards.map(async (rewardRequest, index) => {
      try {
        const rewardValue = RewardCalculator.calculateReward(rewardRequest);

        const rewardSignal: RewardSignal = {
          armId: rewardRequest.armId,
          contextHash:
            rewardRequest.contextHash ||
            rewardRequest.decisionId ||
            `batch_${Date.now()}_${index}`,
          rewardValue,
          rewardType: rewardRequest.rewardType,
          timestamp: Date.now(),
          metadata: rewardRequest.metadata,
        };

        await adaptiveRouter.processReward(rewardSignal);

        successCount++;
        return {
          index,
          success: true,
          rewardValue,
          message: 'Processed successfully',
        };
      } catch (error) {
        errorCount++;
        return {
          index,
          success: false,
          message: error.message,
          rewardValue: 0,
        };
      }
    });

    const processingResults = await Promise.allSettled(processingPromises);

    processingResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          message: result.reason?.message || 'Unknown error',
          rewardValue: 0,
        });
        errorCount++;
      }
    });

    // Record batch metrics
    prometheusConductorMetrics.recordOperationalMetric(
      'reward_batch_size',
      rewards.length,
    );
    prometheusConductorMetrics.recordOperationalMetric(
      'reward_batch_success_count',
      successCount,
    );
    prometheusConductorMetrics.recordOperationalMetric(
      'reward_batch_error_count',
      errorCount,
    );

    res.json({
      success: errorCount === 0,
      message: `Processed ${successCount}/${rewards.length} rewards successfully`,
      successCount,
      errorCount,
      results,
      processingTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Batch reward processing error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Get router performance metrics
 */
rewardRouter.get('/metrics', async (req, res) => {
  try {
    const metrics = adaptiveRouter.getPerformanceMetrics();

    res.json({
      success: true,
      metrics,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Metrics retrieval error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve metrics',
    });
  }
});

/**
 * Get arm statistics
 */
rewardRouter.get('/arms/:armId/stats', async (req, res) => {
  try {
    const { armId } = req.params;
    const metrics = adaptiveRouter.getPerformanceMetrics();

    const armStats = metrics.armStatistics[armId as ExpertArm];
    if (!armStats) {
      return res.status(404).json({
        success: false,
        message: `Arm ${armId} not found`,
      });
    }

    res.json({
      success: true,
      arm: armId,
      statistics: armStats,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Arm statistics error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve arm statistics',
    });
  }
});

/**
 * Reset bandit state (admin endpoint)
 */
rewardRouter.post('/reset', async (req, res) => {
  try {
    const { confirmation } = req.body;

    if (confirmation !== 'RESET_BANDIT_STATE') {
      return res.status(400).json({
        success: false,
        message:
          'Confirmation required: { "confirmation": "RESET_BANDIT_STATE" }',
      });
    }

    await adaptiveRouter.resetBandits();

    prometheusConductorMetrics.recordOperationalEvent('bandit_reset', true);

    res.json({
      success: true,
      message: 'Bandit state reset successfully',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Bandit reset error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to reset bandit state',
    });
  }
});

/**
 * Shadow mode decision tracking
 */
rewardRouter.post('/shadow/:decisionId', async (req, res) => {
  try {
    const { decisionId } = req.params;
    const { productionArm, shadowArm, context } = req.body;

    // Store shadow decision for comparison
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await redis.setex(
      `shadow_decision:${decisionId}`,
      3600, // 1 hour
      JSON.stringify({
        productionArm,
        shadowArm,
        context,
        timestamp: Date.now(),
      }),
    );

    redis.disconnect();

    res.json({
      success: true,
      message: 'Shadow decision recorded',
      decisionId,
    });
  } catch (error) {
    console.error('Shadow decision error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to record shadow decision',
    });
  }
});

/**
 * A/B test result endpoint
 */
rewardRouter.post('/ab-test/:testId/result', async (req, res) => {
  try {
    const { testId } = req.params;
    const { variant, outcome, metadata } = req.body;

    // Process A/B test result as reward signal
    const rewardValue = outcome === 'success' ? 1.0 : 0.0;

    const rewardSignal: RewardSignal = {
      armId: variant as ExpertArm,
      contextHash: `ab_test_${testId}_${Date.now()}`,
      rewardValue,
      rewardType: 'accepted_insight',
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        testId,
        testVariant: variant,
      },
    };

    await adaptiveRouter.processReward(rewardSignal);

    res.json({
      success: true,
      message: 'A/B test result processed',
      testId,
      variant,
      rewardValue,
    });
  } catch (error) {
    console.error('A/B test result error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to process A/B test result',
    });
  }
});

/**
 * Health check for reward API
 */
rewardRouter.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: Date.now(),
    service: 'reward-api',
  });
});

// Middleware to log all reward API calls
rewardRouter.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `Reward API: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
    );

    prometheusConductorMetrics.recordOperationalMetric(
      'reward_api_request_duration',
      duration,
    );
    prometheusConductorMetrics.recordOperationalEvent(
      `reward_api_${req.method.toLowerCase()}`,
      res.statusCode < 400,
    );
  });

  next();
});

export default rewardRouter;
