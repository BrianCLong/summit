import { Request, Response } from 'express';
import { z } from 'zod';
import { Neo4jService } from '../../db/neo4j';
import { RedisService } from '../../cache/redis';
import logger from '../../utils/logger';
import { ActivityFingerprintIndex } from '../intelligence/activityFingerprintIndex';
import { NarrativeImpactModel } from '../intelligence/narrativeImpactModel';
import { MissionVault } from '../intelligence/missionVault';

const CoherenceQuerySchema = z.object({
  tenantId: z.string().min(1),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  filters: z
    .object({
      signalTypes: z.array(z.string()).optional(),
      sources: z.array(z.string()).optional(),
      minWeight: z.number().optional().default(0.1),
      minConfidence: z.number().optional().default(0.5),
    })
    .optional(),
  aggregation: z.enum(['hour', 'day', 'week']).optional().default('hour'),
});

export class CoherenceGraphQLResolvers {
  constructor(
    private neo4j: Neo4jService,
    private redis: RedisService,
    private activityIndex: ActivityFingerprintIndex,
    private narrativeModel: NarrativeImpactModel,
    private missionVault: MissionVault,
  ) {}

  async getCoherenceScore(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }

      // Get current coherence score from materialized view
      const session = this.neo4j.getSession();
      try {
        const result = await session.executeRead(async (tx) => {
          return await tx.run(
            `
            MATCH (t:Tenant {tenant_id: $tenantId})-[:EMITS]->(s:Signal)
            WITH t, 
                 avg(s.value * s.weight) as weighted_avg,
                 count(s) as signal_count,
                 collect(s.type) as signal_types,
                 max(s.ts) as last_signal_time
            RETURN {
              tenantId: t.tenant_id,
              score: weighted_avg,
              signalCount: signal_count,
              signalTypes: signal_types,
              lastSignalTime: last_signal_time,
              status: CASE
                WHEN signal_count >= 50 AND weighted_avg >= 0.8 THEN 'high'
                WHEN signal_count >= 20 AND weighted_avg >= 0.6 THEN 'medium'
                WHEN signal_count >= 10 AND weighted_avg >= 0.4 THEN 'low'
                ELSE 'insufficient'
              END
            } as coherence
          `,
            { tenantId },
          );
        });

        if (result.records.length === 0) {
          return res.status(404).json({
            error: 'No coherence data found for tenant',
            tenantId,
          });
        }

        const coherence = result.records[0].get('coherence');

        // Get activity fingerprints
        const fingerprints =
          await this.activityIndex.getActivityFingerprints(tenantId);

        // Get narrative impacts
        const narrativeImpacts =
          await this.narrativeModel.getNarrativeImpacts(tenantId);

        res.json({
          tenantId,
          coherence: {
            score: coherence.score || 0,
            status: coherence.status,
            signalCount: coherence.signalCount || 0,
            signalTypes: coherence.signalTypes || [],
            lastSignalTime: coherence.lastSignalTime,
            computedAt: new Date().toISOString(),
          },
          intelligence: {
            activityFingerprints: fingerprints.slice(0, 10), // Top 10
            narrativeImpacts: narrativeImpacts.slice(0, 5), // Top 5
            missionContext: await this.missionVault.getMissionContext(tenantId),
          },
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Failed to get coherence score', {
        error,
        tenantId: req.params.tenantId,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async queryCoherenceSignals(req: Request, res: Response) {
    try {
      const validatedInput = CoherenceQuerySchema.parse(req.body);
      const { tenantId, timeRange, filters = {}, aggregation } = validatedInput;

      const session = this.neo4j.getSession();
      try {
        // Build dynamic query based on filters
        let whereClause =
          's.ts >= datetime($startTime) AND s.ts <= datetime($endTime)';
        const params: any = {
          tenantId,
          startTime: timeRange.start,
          endTime: timeRange.end,
        };

        if (filters.signalTypes?.length) {
          whereClause += ' AND s.type IN $signalTypes';
          params.signalTypes = filters.signalTypes;
        }

        if (filters.sources?.length) {
          whereClause += ' AND s.source IN $sources';
          params.sources = filters.sources;
        }

        if (filters.minWeight !== undefined) {
          whereClause += ' AND s.weight >= $minWeight';
          params.minWeight = filters.minWeight;
        }

        // Aggregation logic
        const aggregationField = {
          hour: 'datetime({year: s.ts.year, month: s.ts.month, day: s.ts.day, hour: s.ts.hour})',
          day: 'date(s.ts)',
          week: 'date(s.ts) - duration({days: s.ts.dayOfWeek - 1})',
        }[aggregation];

        const result = await session.executeRead(async (tx) => {
          return await tx.run(
            `
            MATCH (t:Tenant {tenant_id: $tenantId})-[:EMITS]->(s:Signal)
            WHERE ${whereClause}
            WITH ${aggregationField} as timeWindow, s
            RETURN 
              timeWindow,
              count(s) as signalCount,
              avg(s.value * s.weight) as avgWeightedValue,
              collect(DISTINCT s.type) as signalTypes,
              collect(DISTINCT s.source) as sources,
              min(s.value) as minValue,
              max(s.value) as maxValue,
              stddev(s.value) as valueStddev
            ORDER BY timeWindow
          `,
            params,
          );
        });

        const signals = result.records.map((record) => ({
          timeWindow: record.get('timeWindow'),
          signalCount: record.get('signalCount'),
          avgWeightedValue: record.get('avgWeightedValue') || 0,
          signalTypes: record.get('signalTypes') || [],
          sources: record.get('sources') || [],
          minValue: record.get('minValue'),
          maxValue: record.get('maxValue'),
          valueStddev: record.get('valueStddev') || 0,
        }));

        // Calculate trend analysis
        const trend = this.calculateTrend(signals);

        // Get anomaly detection results
        const anomalies = await this.detectAnomalies(tenantId, signals);

        res.json({
          tenantId,
          query: {
            timeRange,
            filters,
            aggregation,
          },
          results: {
            signals,
            trend,
            anomalies,
            summary: {
              totalWindows: signals.length,
              totalSignals: signals.reduce((sum, s) => sum + s.signalCount, 0),
              avgCoherenceScore:
                signals.reduce((sum, s) => sum + s.avgWeightedValue, 0) /
                  signals.length || 0,
            },
          },
          metadata: {
            queryTime: new Date().toISOString(),
            cacheStatus: 'live', // Could implement caching later
          },
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors,
        });
      }

      logger.error('Failed to query coherence signals', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getCoherenceInsights(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const timeRange = (req.query.timeRange as string) || '24h';

      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }

      // Get comprehensive insights from all intelligence modules
      const [fingerprints, narratives, missionContext, riskAssessment] =
        await Promise.all([
          this.activityIndex.getActivityFingerprints(tenantId),
          this.narrativeModel.getNarrativeImpacts(tenantId),
          this.missionVault.getMissionContext(tenantId),
          this.assessCoherenceRisk(tenantId, timeRange),
        ]);

      const insights = {
        tenantId,
        timeRange,
        intelligence: {
          activityFingerprints: fingerprints,
          narrativeImpacts: narratives,
          missionContext,
          riskAssessment,
        },
        recommendations: this.generateRecommendations(
          fingerprints,
          narratives,
          riskAssessment,
        ),
        metadata: {
          generatedAt: new Date().toISOString(),
          confidenceLevel: this.calculateConfidenceLevel(
            fingerprints,
            narratives,
          ),
          dataQuality: await this.assessDataQuality(tenantId),
        },
      };

      res.json(insights);
    } catch (error) {
      logger.error('Failed to get coherence insights', {
        error,
        tenantId: req.params.tenantId,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private calculateTrend(signals: any[]): {
    direction: string;
    confidence: number;
    slope: number;
  } {
    if (signals.length < 2) {
      return { direction: 'insufficient_data', confidence: 0, slope: 0 };
    }

    // Simple linear regression for trend analysis
    const n = signals.length;
    const xValues = signals.map((_, i) => i);
    const yValues = signals.map((s) => s.avgWeightedValue);

    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;

    const numerator = xValues.reduce(
      (sum, x, i) => sum + (x - xMean) * (yValues[i] - yMean),
      0,
    );
    const denominator = xValues.reduce(
      (sum, x) => sum + Math.pow(x - xMean, 2),
      0,
    );

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const direction =
      slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
    const confidence = Math.min(Math.abs(slope) * 10, 1); // Simple confidence metric

    return { direction, confidence, slope };
  }

  private async detectAnomalies(
    tenantId: string,
    signals: any[],
  ): Promise<any[]> {
    // Simple statistical anomaly detection
    if (signals.length < 3) return [];

    const values = signals.map((s) => s.avgWeightedValue);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stddev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length,
    );

    const threshold = 2 * stddev; // 2-sigma threshold

    return signals
      .filter((signal, i) => {
        const deviation = Math.abs(signal.avgWeightedValue - mean);
        return deviation > threshold;
      })
      .map((signal, i) => ({
        timeWindow: signal.timeWindow,
        value: signal.avgWeightedValue,
        expectedRange: [mean - threshold, mean + threshold],
        deviation: Math.abs(signal.avgWeightedValue - mean),
        severity:
          Math.abs(signal.avgWeightedValue - mean) > 3 * stddev
            ? 'high'
            : 'medium',
      }));
  }

  private async assessCoherenceRisk(
    tenantId: string,
    timeRange: string,
  ): Promise<any> {
    // Risk assessment based on coherence patterns
    const session = this.neo4j.getSession();
    try {
      const result = await session.executeRead(async (tx) => {
        return await tx.run(
          `
          MATCH (t:Tenant {tenant_id: $tenantId})-[:EMITS]->(s:Signal)
          WHERE s.ts >= datetime() - duration('${timeRange}')
          WITH s
          RETURN 
            count(s) as totalSignals,
            avg(s.value) as avgValue,
            stddev(s.value) as valueVariance,
            collect(DISTINCT s.source) as uniqueSources,
            collect(DISTINCT s.type) as uniqueTypes
        `,
          { tenantId },
        );
      });

      if (result.records.length === 0) {
        return { level: 'unknown', factors: ['insufficient_data'] };
      }

      const record = result.records[0];
      const totalSignals = record.get('totalSignals');
      const avgValue = record.get('avgValue') || 0;
      const valueVariance = record.get('valueVariance') || 0;
      const uniqueSources = record.get('uniqueSources') || [];
      const uniqueTypes = record.get('uniqueTypes') || [];

      // Risk factors
      const factors = [];
      let riskScore = 0;

      if (totalSignals < 10) {
        factors.push('low_signal_volume');
        riskScore += 0.3;
      }

      if (valueVariance > 0.5) {
        factors.push('high_variance');
        riskScore += 0.2;
      }

      if (uniqueSources.length < 3) {
        factors.push('limited_sources');
        riskScore += 0.2;
      }

      if (avgValue < 0.3) {
        factors.push('low_coherence');
        riskScore += 0.4;
      }

      const level =
        riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low';

      return {
        level,
        score: riskScore,
        factors,
        metrics: {
          totalSignals,
          avgValue,
          valueVariance,
          sourceCount: uniqueSources.length,
          typeCount: uniqueTypes.length,
        },
      };
    } finally {
      await session.close();
    }
  }

  private generateRecommendations(
    fingerprints: any[],
    narratives: any[],
    riskAssessment: any,
  ): string[] {
    const recommendations = [];

    if (riskAssessment.level === 'high') {
      recommendations.push(
        'Increase signal collection frequency to improve coherence baseline',
      );
      recommendations.push(
        'Diversify signal sources to reduce single-point-of-failure risk',
      );
    }

    if (fingerprints.length < 5) {
      recommendations.push(
        'Expand activity monitoring to capture more behavioral patterns',
      );
    }

    if (narratives.length === 0) {
      recommendations.push(
        'Implement narrative tracking to understand information flow impacts',
      );
    }

    if (riskAssessment.factors.includes('high_variance')) {
      recommendations.push('Review signal weighting strategy to reduce noise');
    }

    return recommendations.length > 0
      ? recommendations
      : ['Coherence levels are within normal parameters'];
  }

  private calculateConfidenceLevel(
    fingerprints: any[],
    narratives: any[],
  ): number {
    // Simple confidence calculation based on data availability
    let confidence = 0.5; // Base confidence

    if (fingerprints.length > 10) confidence += 0.2;
    if (narratives.length > 5) confidence += 0.2;
    if (fingerprints.some((fp) => fp.confidence > 0.8)) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private async assessDataQuality(tenantId: string): Promise<any> {
    const session = this.neo4j.getSession();
    try {
      const result = await session.executeRead(async (tx) => {
        return await tx.run(
          `
          MATCH (t:Tenant {tenant_id: $tenantId})-[:EMITS]->(s:Signal)
          WITH s
          RETURN 
            count(s) as totalSignals,
            count(CASE WHEN s.provenance_id IS NOT NULL THEN 1 END) as signalsWithProvenance,
            count(CASE WHEN s.weight > 0 THEN 1 END) as signalsWithWeight,
            avg(duration.inSeconds(datetime() - s.ts)) as avgAgeSeconds
        `,
          { tenantId },
        );
      });

      if (result.records.length === 0) {
        return { score: 0, factors: ['no_data'] };
      }

      const record = result.records[0];
      const total = record.get('totalSignals');
      const withProvenance = record.get('signalsWithProvenance');
      const withWeight = record.get('signalsWithWeight');
      const avgAge = record.get('avgAgeSeconds') || 0;

      const provenanceRatio = total > 0 ? withProvenance / total : 0;
      const weightRatio = total > 0 ? withWeight / total : 0;
      const freshnessScore =
        avgAge < 86400 ? 1 : Math.max(0, 1 - (avgAge - 86400) / 604800); // 1 week decay

      const score =
        provenanceRatio * 0.4 + weightRatio * 0.3 + freshnessScore * 0.3;

      return {
        score,
        factors: {
          provenanceCompliance: provenanceRatio,
          weightingCompliance: weightRatio,
          dataFreshness: freshnessScore,
        },
        metrics: {
          totalSignals: total,
          avgAgeHours: avgAge / 3600,
        },
      };
    } finally {
      await session.close();
    }
  }
}
