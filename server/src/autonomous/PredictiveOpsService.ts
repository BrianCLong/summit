import { rollup } from '../ops/capacity.js';
import { PredictiveService } from '../predictive/PredictiveService.js';
import { Logger } from 'pino';

export enum SignalConfidence {
  INFORM = 'inform',
  SUGGEST = 'suggest',
  PREPARE = 'prepare',
}

export interface PredictiveSignal {
  type: string;
  confidence: SignalConfidence;
  payload: any;
  tenantId: string;
  timestamp: number;
}

export class PredictiveOpsService {
  private predictiveService: PredictiveService;
  private logger: Logger;

  constructor(predictiveService: PredictiveService, logger: Logger) {
    this.predictiveService = predictiveService;
    this.logger = logger;
  }

  /**
   * Checks for predictive signals for a given tenant
   */
  async checkSignals(tenantId: string): Promise<PredictiveSignal[]> {
    const signals: PredictiveSignal[] = [];

    try {
      // 1. Check Capacity Saturation
      const capacitySignal = await this.checkCapacitySaturation(tenantId);
      if (capacitySignal) signals.push(capacitySignal);

      // 2. Check Error Rate Inflection
      const errorSignal = await this.checkErrorRateInflection(tenantId);
      if (errorSignal) signals.push(errorSignal);

      // 3. Check Approval Queue Backlog
      // TODO: Implement queue backlog check once ApprovalService is ready

    } catch (error: any) {
      this.logger.error({ tenantId, error }, 'Failed to check predictive signals');
    }

    return signals;
  }

  private async checkCapacitySaturation(tenantId: string): Promise<PredictiveSignal | null> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    try {
        // Get current usage
        const currentStats = await rollup(tenantId, oneHourAgo.toISOString(), now.toISOString());

        // Forecast usage for next 24 hours
        // We use 'activity' metric as a proxy for capacity usage
        const forecast = await this.predictiveService.forecastRisk({
            entityId: tenantId,
            metric: 'activity',
            horizon: 24, // 24 hours
            legalBasis: { purpose: 'Capacity planning', policyId: 'autonomous-ops-forecast' },
        });

        // Determine if saturation is likely
        // Simple logic: if any forecast point exceeds a threshold (e.g., 90% of some hypothetical max)
        // Since we don't have the max capacity here, we'll use a relative increase check
        // e.g., if forecast is 2x current usage

        const currentUsage = currentStats.usage.cpu_sec;
        const maxForecast = Math.max(...forecast.forecast.map(f => f.value));

        if (maxForecast > currentUsage * 1.5) {
             return {
                type: 'capacity_saturation_risk',
                confidence: SignalConfidence.PREPARE,
                tenantId,
                timestamp: Date.now(),
                payload: {
                    current: currentUsage,
                    forecast: maxForecast,
                    reason: 'Projected 50% increase in CPU usage'
                }
            };
        } else if (maxForecast > currentUsage * 1.2) {
            return {
                type: 'capacity_saturation_risk',
                confidence: SignalConfidence.SUGGEST,
                tenantId,
                timestamp: Date.now(),
                payload: {
                    current: currentUsage,
                    forecast: maxForecast,
                    reason: 'Projected 20% increase in CPU usage'
                }
            };
        }

    } catch (error: any) {
        this.logger.warn({ tenantId, error }, 'Error checking capacity saturation');
    }

    return null;
  }

  private async checkErrorRateInflection(tenantId: string): Promise<PredictiveSignal | null> {
     // Mock implementation for error rate inflection
     // In a real scenario, this would query Prometheus or logs

     // 10% chance of detecting an inflection for demo purposes
     if (Math.random() > 0.9) {
         return {
             type: 'error_rate_inflection',
             confidence: SignalConfidence.INFORM,
             tenantId,
             timestamp: Date.now(),
             payload: {
                 reason: 'Slight deviation in error baseline detected'
             }
         };
     }

     return null;
  }
}
