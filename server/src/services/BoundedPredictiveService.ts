import { AnalyticsType, PredictiveResult } from '../types/analytics.js';
import { timeSeriesIntelligence } from './TimeSeriesIntelligenceService.js';
import { getFeatureFlagService } from '../feature-flags/setup.js';
import { logger } from '../config/logger.js';
import { PredictiveAnalyticsNotEnabledError } from '../lib/errors.js';

export class BoundedPredictiveService {
  private static instance: BoundedPredictiveService;

  private constructor() {}

  public static getInstance(): BoundedPredictiveService {
    if (!BoundedPredictiveService.instance) {
      BoundedPredictiveService.instance = new BoundedPredictiveService();
    }
    return BoundedPredictiveService.instance;
  }

  /**
   * Forecasts ledger activity for a given entity with strict bounding and governance.
   */
  async forecastLedgerActivity(
    tenantId: string,
    entityId: string
  ): Promise<PredictiveResult<any>> {
    // 1. Opt-in / Gating Check
    const flagService = getFeatureFlagService();
    // Default to false for safety
    const isEnabled = await flagService.isEnabled('predictive_analytics_enabled', { key: tenantId }, false);

    if (!isEnabled) {
      // In a real scenario, we might return a specific error code or a neutral result.
      // For this "opt-in" requirement, we throw to indicate this path is forbidden.
      throw new PredictiveAnalyticsNotEnabledError();
    }

    try {
      // 2. Fetch Forecast from Engine
      // Horizon 7 days, Lookback 90 days
      const result = await timeSeriesIntelligence.forecastActivity(entityId, tenantId, 7, 90);

      // 3. Safety Guard: Insufficient Data
      // If historical data points are too few, we abort prediction.
      if (!result.historical || result.historical.length < 5) {
        return {
          type: AnalyticsType.PREDICTIVE,
          value: null,
          confidence: 0,
          status: 'INSUFFICIENT_DATA',
          explanation: {
            method: 'None',
            assumptions: [],
            inputSummary: `Insufficient historical data points (${result.historical?.length || 0} < 5)`,
            confidenceBasis: 'None'
          },
          traceability: {
            sourceIds: [entityId]
          }
        };
      }

      // 4. Safety Guard: Confidence Clamping
      // We never return 1.0 (100%) confidence. We clamp the model's confidence.
      // The model returns a heuristic confidence (e.g. 0.85). We ensure it is capped.
      const rawConfidence = result.model.confidence;
      const MAX_CONFIDENCE = 0.85;
      const confidence = Math.min(rawConfidence, MAX_CONFIDENCE);

      // 5. Construct Explanation
      return {
        type: AnalyticsType.PREDICTIVE,
        value: result.forecast,
        confidence,
        status: 'SUCCESS',
        explanation: {
          method: timeSeriesIntelligence.ALGORITHM_NAME,
          assumptions: [
            'Historical trend continuity',
            'No external structural breaks',
            'Seasonality is stable if present'
          ],
          inputSummary: `Based on ${result.historical.length} days of historical activity volume`,
          confidenceBasis: `Statistical fit (Residuals) clamped to max ${MAX_CONFIDENCE}`
        },
        traceability: {
          sourceIds: [entityId],
          provenanceHash: 'dynamic-computation' // In a real system, we'd link to specific ledger entries
        }
      };

    } catch (error) {
      logger.error({ err: error, tenantId, entityId }, 'Error generating predictive forecast');
      return {
        type: AnalyticsType.PREDICTIVE,
        value: null,
        confidence: 0,
        status: 'UNKNOWN',
        explanation: {
          method: 'Error',
          assumptions: [],
          inputSummary: 'Error during computation',
          confidenceBasis: 'None'
        },
        traceability: { sourceIds: [] }
      };
    }
  }
}

export const boundedPredictiveService = BoundedPredictiveService.getInstance();
