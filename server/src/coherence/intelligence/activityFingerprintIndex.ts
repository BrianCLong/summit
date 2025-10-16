import { Neo4jService } from '../../db/neo4j';
import { RedisService } from '../../cache/redis';
import logger from '../../utils/logger';
import { randomUUID as uuidv4 } from 'crypto';

export interface ActivityFingerprint {
  id: string;
  tenantId: string;
  type: string;
  pattern: string;
  confidence: number;
  metadata: Record<string, any>;
  firstSeen: string;
  lastSeen: string;
  frequency: number;
  significance: number;
  relatedEntities: string[];
  behavioralSignatures: BehavioralSignature[];
}

export interface BehavioralSignature {
  signatureId: string;
  type: 'temporal' | 'spatial' | 'relational' | 'semantic';
  features: Record<string, number>;
  weight: number;
  entropy: number;
}

export interface ActivityPattern {
  patternId: string;
  name: string;
  description: string;
  signatures: BehavioralSignature[];
  matchingCriteria: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
}

export class ActivityFingerprintIndex {
  private patterns: Map<string, ActivityPattern> = new Map();

  constructor(
    private neo4j: Neo4jService,
    private redis: RedisService,
  ) {
    this.initializePatterns();
  }

  private initializePatterns() {
    // Define standard activity patterns for intelligence analysis
    const patterns: ActivityPattern[] = [
      {
        patternId: 'login_sequence',
        name: 'Authentication Sequence',
        description: 'Sequential login attempts with timing analysis',
        signatures: [
          {
            signatureId: 'temporal_login',
            type: 'temporal',
            features: {
              interval_variance: 0.2,
              peak_hours: 9,
              frequency_score: 0.8,
            },
            weight: 0.7,
            entropy: 0.45,
          },
        ],
        matchingCriteria: {
          signalTypes: ['authentication', 'session_start'],
          minFrequency: 3,
          timeWindow: '1h',
        },
        riskLevel: 'low',
      },
      {
        patternId: 'data_exfiltration',
        name: 'Data Exfiltration Pattern',
        description: 'Unusual data access and transfer patterns',
        signatures: [
          {
            signatureId: 'volume_anomaly',
            type: 'relational',
            features: {
              volume_multiplier: 5.0,
              access_pattern_deviation: 0.8,
              time_compression: 0.3,
            },
            weight: 0.9,
            entropy: 0.75,
          },
          {
            signatureId: 'temporal_clustering',
            type: 'temporal',
            features: {
              burst_intensity: 0.9,
              off_hours_activity: 0.7,
              duration_compression: 0.4,
            },
            weight: 0.8,
            entropy: 0.6,
          },
        ],
        matchingCriteria: {
          signalTypes: ['data_access', 'file_transfer', 'network_activity'],
          minFrequency: 10,
          timeWindow: '30m',
        },
        riskLevel: 'high',
      },
      {
        patternId: 'reconnaissance',
        name: 'Reconnaissance Activity',
        description: 'Systematic information gathering behavior',
        signatures: [
          {
            signatureId: 'systematic_scan',
            type: 'spatial',
            features: {
              coverage_breadth: 0.8,
              methodical_progression: 0.9,
              target_diversity: 0.7,
            },
            weight: 0.8,
            entropy: 0.55,
          },
        ],
        matchingCriteria: {
          signalTypes: ['network_scan', 'service_discovery', 'enumeration'],
          minFrequency: 5,
          timeWindow: '2h',
        },
        riskLevel: 'medium',
      },
    ];

    patterns.forEach((pattern) => {
      this.patterns.set(pattern.patternId, pattern);
    });

    logger.info('Initialized activity patterns', {
      patternCount: this.patterns.size,
      patterns: Array.from(this.patterns.keys()),
    });
  }

  async indexActivity(
    tenantId: string,
    signals: any[],
  ): Promise<ActivityFingerprint[]> {
    if (!signals.length) return [];

    try {
      const fingerprints: ActivityFingerprint[] = [];

      // Group signals by type for pattern matching
      const signalsByType = this.groupSignalsByType(signals);

      // Match against known patterns
      for (const [patternId, pattern] of this.patterns.entries()) {
        const matches = await this.matchPattern(
          tenantId,
          pattern,
          signalsByType,
        );
        fingerprints.push(...matches);
      }

      // Discover new patterns using unsupervised learning
      const discoveredPatterns = await this.discoverNewPatterns(
        tenantId,
        signals,
      );
      fingerprints.push(...discoveredPatterns);

      // Store fingerprints in Neo4j
      await this.storeFingerprints(tenantId, fingerprints);

      // Update Redis cache
      await this.cacheFingerprints(tenantId, fingerprints);

      logger.info('Activity indexing completed', {
        tenantId,
        signalCount: signals.length,
        fingerprintCount: fingerprints.length,
        patternMatches: fingerprints.filter((f) => f.type !== 'discovered')
          .length,
        discoveredPatterns: fingerprints.filter((f) => f.type === 'discovered')
          .length,
      });

      return fingerprints;
    } catch (error) {
      logger.error('Failed to index activity', {
        error,
        tenantId,
        signalCount: signals.length,
      });
      throw error;
    }
  }

  async getActivityFingerprints(
    tenantId: string,
    options: {
      limit?: number;
      minConfidence?: number;
      types?: string[];
      timeRange?: { start: string; end: string };
    } = {},
  ): Promise<ActivityFingerprint[]> {
    const { limit = 50, minConfidence = 0.3, types, timeRange } = options;

    try {
      // Try cache first
      const cacheKey = `fingerprints:${tenantId}:${JSON.stringify(options)}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        const fingerprints = JSON.parse(cached);
        logger.debug('Retrieved fingerprints from cache', {
          tenantId,
          count: fingerprints.length,
        });
        return fingerprints;
      }

      // Query from Neo4j
      const session = this.neo4j.getSession();
      try {
        let whereClause = 'af.confidence >= $minConfidence';
        const params: any = { tenantId, minConfidence };

        if (types?.length) {
          whereClause += ' AND af.type IN $types';
          params.types = types;
        }

        if (timeRange) {
          whereClause +=
            ' AND af.last_seen >= datetime($startTime) AND af.last_seen <= datetime($endTime)';
          params.startTime = timeRange.start;
          params.endTime = timeRange.end;
        }

        const result = await session.executeRead(async (tx) => {
          return await tx.run(
            `
            MATCH (t:Tenant {tenant_id: $tenantId})-[:HAS_ACTIVITY]->(af:ActivityFingerprint)
            WHERE ${whereClause}
            OPTIONAL MATCH (af)-[:RELATES_TO]->(e:Entity)
            WITH af, collect(e.entity_id) as relatedEntities
            RETURN af {
              .*,
              relatedEntities: relatedEntities,
              behavioralSignatures: af.behavioral_signatures
            }
            ORDER BY af.significance DESC, af.last_seen DESC
            LIMIT $limit
          `,
            { ...params, limit },
          );
        });

        const fingerprints = result.records.map((record) => {
          const fp = record.get('af');
          return {
            id: fp.fingerprint_id,
            tenantId: fp.tenant_id,
            type: fp.type,
            pattern: fp.pattern,
            confidence: fp.confidence,
            metadata: fp.metadata || {},
            firstSeen: fp.first_seen,
            lastSeen: fp.last_seen,
            frequency: fp.frequency,
            significance: fp.significance,
            relatedEntities: fp.relatedEntities || [],
            behavioralSignatures: fp.behavioralSignatures || [],
          };
        });

        // Cache results
        await this.redis.setex(cacheKey, 300, JSON.stringify(fingerprints)); // 5min cache

        logger.debug('Retrieved fingerprints from Neo4j', {
          tenantId,
          count: fingerprints.length,
        });
        return fingerprints;
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Failed to get activity fingerprints', {
        error,
        tenantId,
        options,
      });
      return [];
    }
  }

  async analyzeActivityEvolution(
    tenantId: string,
    timeWindow: string = '24h',
  ): Promise<{
    trends: any[];
    emergingPatterns: ActivityFingerprint[];
    riskChanges: any[];
  }> {
    const session = this.neo4j.getSession();

    try {
      // Analyze fingerprint evolution over time
      const trendResult = await session.executeRead(async (tx) => {
        return await tx.run(
          `
          MATCH (t:Tenant {tenant_id: $tenantId})-[:HAS_ACTIVITY]->(af:ActivityFingerprint)
          WHERE af.last_seen >= datetime() - duration($timeWindow)
          WITH af, date(af.last_seen) as activity_date
          RETURN 
            activity_date,
            af.type,
            count(af) as fingerprint_count,
            avg(af.confidence) as avg_confidence,
            max(af.significance) as max_significance
          ORDER BY activity_date DESC
        `,
          { tenantId, timeWindow },
        );
      });

      const trends = trendResult.records.map((record) => ({
        date: record.get('activity_date'),
        type: record.get('af.type'),
        count: record.get('fingerprint_count'),
        avgConfidence: record.get('avg_confidence'),
        maxSignificance: record.get('max_significance'),
      }));

      // Identify emerging patterns (high confidence, recent)
      const emergingResult = await session.executeRead(async (tx) => {
        return await tx.run(
          `
          MATCH (t:Tenant {tenant_id: $tenantId})-[:HAS_ACTIVITY]->(af:ActivityFingerprint)
          WHERE af.confidence >= 0.7 
            AND af.first_seen >= datetime() - duration($timeWindow)
            AND af.frequency >= 5
          OPTIONAL MATCH (af)-[:RELATES_TO]->(e:Entity)
          WITH af, collect(e.entity_id) as relatedEntities
          RETURN af {
            .*,
            relatedEntities: relatedEntities
          }
          ORDER BY af.confidence DESC, af.frequency DESC
          LIMIT 10
        `,
          { tenantId, timeWindow },
        );
      });

      const emergingPatterns = emergingResult.records.map((record) => {
        const fp = record.get('af');
        return {
          id: fp.fingerprint_id,
          tenantId: fp.tenant_id,
          type: fp.type,
          pattern: fp.pattern,
          confidence: fp.confidence,
          metadata: fp.metadata || {},
          firstSeen: fp.first_seen,
          lastSeen: fp.last_seen,
          frequency: fp.frequency,
          significance: fp.significance,
          relatedEntities: fp.relatedEntities || [],
          behavioralSignatures: fp.behavioral_signatures || [],
        };
      });

      // Calculate risk changes
      const riskChanges = await this.calculateRiskChanges(tenantId, timeWindow);

      return {
        trends,
        emergingPatterns,
        riskChanges,
      };
    } finally {
      await session.close();
    }
  }

  private groupSignalsByType(signals: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();

    signals.forEach((signal) => {
      const type = signal.type;
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push(signal);
    });

    return grouped;
  }

  private async matchPattern(
    tenantId: string,
    pattern: ActivityPattern,
    signalsByType: Map<string, any[]>,
  ): Promise<ActivityFingerprint[]> {
    const matches: ActivityFingerprint[] = [];

    // Check if required signal types are present
    const requiredTypes = pattern.matchingCriteria.signalTypes;
    const hasRequiredTypes = requiredTypes.some((type) =>
      signalsByType.has(type),
    );

    if (!hasRequiredTypes) return matches;

    // Collect relevant signals
    const relevantSignals = requiredTypes.flatMap(
      (type) => signalsByType.get(type) || [],
    );

    if (relevantSignals.length < pattern.matchingCriteria.minFrequency) {
      return matches;
    }

    // Calculate behavioral signatures
    const behavioralSignatures = await this.calculateBehavioralSignatures(
      pattern,
      relevantSignals,
    );

    // Calculate overall confidence
    const confidence = this.calculatePatternConfidence(
      pattern,
      behavioralSignatures,
    );

    if (confidence >= 0.3) {
      // Minimum confidence threshold
      const fingerprint: ActivityFingerprint = {
        id: uuidv4(),
        tenantId,
        type: pattern.patternId,
        pattern: pattern.name,
        confidence,
        metadata: {
          patternDescription: pattern.description,
          riskLevel: pattern.riskLevel,
          signalCount: relevantSignals.length,
          matchedCriteria: pattern.matchingCriteria,
        },
        firstSeen: relevantSignals.reduce(
          (earliest, s) => (s.ts < earliest ? s.ts : earliest),
          relevantSignals[0].ts,
        ),
        lastSeen: relevantSignals.reduce(
          (latest, s) => (s.ts > latest ? s.ts : latest),
          relevantSignals[0].ts,
        ),
        frequency: relevantSignals.length,
        significance: this.calculateSignificance(
          pattern,
          confidence,
          relevantSignals.length,
        ),
        relatedEntities: Array.from(
          new Set(relevantSignals.map((s: any) => String(s.source))),
        ).filter(Boolean),
        behavioralSignatures,
      };

      matches.push(fingerprint);
    }

    return matches;
  }

  private async calculateBehavioralSignatures(
    pattern: ActivityPattern,
    signals: any[],
  ): Promise<BehavioralSignature[]> {
    return pattern.signatures.map((templateSig) => {
      const features: Record<string, number> = {};

      if (templateSig.type === 'temporal') {
        features.interval_variance = this.calculateIntervalVariance(signals);
        features.peak_hours = this.calculatePeakHours(signals);
        features.frequency_score = signals.length / 100; // Normalized frequency
      } else if (templateSig.type === 'spatial') {
        features.coverage_breadth = this.calculateCoverageBreadth(signals);
        features.methodical_progression =
          this.calculateMethodicalProgression(signals);
        features.target_diversity = this.calculateTargetDiversity(signals);
      } else if (templateSig.type === 'relational') {
        features.volume_multiplier = this.calculateVolumeMultiplier(signals);
        features.access_pattern_deviation =
          this.calculateAccessPatternDeviation(signals);
        features.time_compression = this.calculateTimeCompression(signals);
      }

      return {
        signatureId: templateSig.signatureId,
        type: templateSig.type,
        features,
        weight: templateSig.weight,
        entropy: this.calculateEntropy(Object.values(features)),
      };
    });
  }

  private calculatePatternConfidence(
    pattern: ActivityPattern,
    signatures: BehavioralSignature[],
  ): number {
    if (!signatures.length) return 0;

    const weightedScores = signatures.map((sig) => {
      // Compare actual features with template features
      const templateSig = pattern.signatures.find(
        (ts) => ts.signatureId === sig.signatureId,
      );
      if (!templateSig) return 0;

      let featureMatchScore = 0;
      let featureCount = 0;

      for (const [featureName, actualValue] of Object.entries(sig.features)) {
        const templateValue = templateSig.features[featureName];
        if (templateValue !== undefined) {
          // Calculate similarity (closer to template = higher score)
          const similarity =
            1 - Math.min(1, Math.abs(actualValue - templateValue));
          featureMatchScore += similarity;
          featureCount++;
        }
      }

      const avgFeatureMatch =
        featureCount > 0 ? featureMatchScore / featureCount : 0;
      return avgFeatureMatch * sig.weight;
    });

    return (
      weightedScores.reduce((sum, score) => sum + score, 0) / signatures.length
    );
  }

  private calculateSignificance(
    pattern: ActivityPattern,
    confidence: number,
    frequency: number,
  ): number {
    const riskMultiplier =
      pattern.riskLevel === 'high'
        ? 1.5
        : pattern.riskLevel === 'medium'
          ? 1.2
          : 1.0;
    const frequencyScore = Math.min(1, frequency / 20); // Normalize to max frequency of 20
    return confidence * riskMultiplier * frequencyScore;
  }

  private async discoverNewPatterns(
    tenantId: string,
    signals: any[],
  ): Promise<ActivityFingerprint[]> {
    // Placeholder for unsupervised pattern discovery
    // In production, this could use clustering algorithms or anomaly detection

    const patterns: ActivityFingerprint[] = [];

    // Simple frequency-based pattern discovery
    const typeFrequency = new Map<string, number>();
    signals.forEach((signal) => {
      typeFrequency.set(signal.type, (typeFrequency.get(signal.type) || 0) + 1);
    });

    for (const [type, frequency] of typeFrequency.entries()) {
      if (frequency >= 10) {
        // Threshold for considering as pattern
        const typeSignals = signals.filter((s) => s.type === type);

        const pattern: ActivityFingerprint = {
          id: uuidv4(),
          tenantId,
          type: 'discovered',
          pattern: `Discovered ${type} pattern`,
          confidence: Math.min(0.8, frequency / 50),
          metadata: {
            discoveryMethod: 'frequency_analysis',
            signalType: type,
          },
          firstSeen: typeSignals.reduce(
            (earliest, s) => (s.ts < earliest ? s.ts : earliest),
            typeSignals[0].ts,
          ),
          lastSeen: typeSignals.reduce(
            (latest, s) => (s.ts > latest ? s.ts : latest),
            typeSignals[0].ts,
          ),
          frequency,
          significance: frequency / 100,
          relatedEntities: [...new Set(typeSignals.map((s) => s.source))],
          behavioralSignatures: [],
        };

        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private async storeFingerprints(
    tenantId: string,
    fingerprints: ActivityFingerprint[],
  ): Promise<void> {
    if (!fingerprints.length) return;

    const session = this.neo4j.getSession();
    try {
      await session.executeWrite(async (tx) => {
        for (const fp of fingerprints) {
          await tx.run(
            `
            MATCH (t:Tenant {tenant_id: $tenantId})
            MERGE (af:ActivityFingerprint {fingerprint_id: $fingerprintId})
            SET af += {
              tenant_id: $tenantId,
              type: $type,
              pattern: $pattern,
              confidence: $confidence,
              metadata: $metadata,
              first_seen: datetime($firstSeen),
              last_seen: datetime($lastSeen),
              frequency: $frequency,
              significance: $significance,
              behavioral_signatures: $behavioralSignatures,
              updated_at: datetime()
            }
            MERGE (t)-[:HAS_ACTIVITY]->(af)
          `,
            {
              tenantId,
              fingerprintId: fp.id,
              type: fp.type,
              pattern: fp.pattern,
              confidence: fp.confidence,
              metadata: JSON.stringify(fp.metadata),
              firstSeen: fp.firstSeen,
              lastSeen: fp.lastSeen,
              frequency: fp.frequency,
              significance: fp.significance,
              behavioralSignatures: JSON.stringify(fp.behavioralSignatures),
            },
          );

          // Link to related entities
          for (const entityId of fp.relatedEntities) {
            await tx.run(
              `
              MATCH (af:ActivityFingerprint {fingerprint_id: $fingerprintId})
              MERGE (e:Entity {entity_id: $entityId})
              MERGE (af)-[:RELATES_TO]->(e)
            `,
              { fingerprintId: fp.id, entityId },
            );
          }
        }
      });
    } finally {
      await session.close();
    }
  }

  private async cacheFingerprints(
    tenantId: string,
    fingerprints: ActivityFingerprint[],
  ): Promise<void> {
    const cacheKey = `fingerprints:${tenantId}:latest`;
    await this.redis.setex(cacheKey, 600, JSON.stringify(fingerprints)); // 10min cache
  }

  private async calculateRiskChanges(
    tenantId: string,
    timeWindow: string,
  ): Promise<any[]> {
    // Implementation for risk change calculation
    // This would compare current risk levels with historical baselines
    return [];
  }

  // Helper methods for behavioral signature calculation
  private calculateIntervalVariance(signals: any[]): number {
    if (signals.length < 2) return 0;

    const intervals = [];
    for (let i = 1; i < signals.length; i++) {
      const interval =
        new Date(signals[i].ts).getTime() -
        new Date(signals[i - 1].ts).getTime();
      intervals.push(interval);
    }

    const mean =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance =
      intervals.reduce(
        (sum, interval) => sum + Math.pow(interval - mean, 2),
        0,
      ) / intervals.length;

    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  private calculatePeakHours(signals: any[]): number {
    const hourCounts = new Array(24).fill(0);

    signals.forEach((signal) => {
      const hour = new Date(signal.ts).getHours();
      hourCounts[hour]++;
    });

    const maxCount = Math.max(...hourCounts);
    return hourCounts.indexOf(maxCount);
  }

  private calculateCoverageBreadth(signals: any[]): number {
    const uniqueTargets = new Set(signals.map((s) => s.target || s.source));
    return Math.min(1, uniqueTargets.size / 10); // Normalized to max 10 targets
  }

  private calculateMethodicalProgression(signals: any[]): number {
    // Simple heuristic: signals with consistent intervals suggest methodical behavior
    if (signals.length < 3) return 0;

    const intervals = [];
    for (let i = 1; i < signals.length; i++) {
      const interval =
        new Date(signals[i].ts).getTime() -
        new Date(signals[i - 1].ts).getTime();
      intervals.push(interval);
    }

    const avgInterval =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance =
      intervals.reduce(
        (sum, interval) => sum + Math.pow(interval - avgInterval, 2),
        0,
      ) / intervals.length;

    return Math.max(0, 1 - Math.sqrt(variance) / avgInterval);
  }

  private calculateTargetDiversity(signals: any[]): number {
    const uniqueTargets = new Set(signals.map((s) => s.target || s.source));
    return Math.min(1, uniqueTargets.size / signals.length);
  }

  private calculateVolumeMultiplier(signals: any[]): number {
    const volumes = signals.map((s) => s.value || 1);
    const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
    const avgVolume = totalVolume / volumes.length;

    // Compare with historical baseline (simplified)
    const historicalAvg = 1.0; // This would come from historical data
    return totalVolume / (historicalAvg * volumes.length);
  }

  private calculateAccessPatternDeviation(signals: any[]): number {
    // Simplified pattern deviation calculation
    const sources = signals.map((s) => s.source);
    const uniqueSources = new Set(sources);
    return uniqueSources.size / sources.length;
  }

  private calculateTimeCompression(signals: any[]): number {
    if (signals.length < 2) return 0;

    const totalDuration =
      new Date(signals[signals.length - 1].ts).getTime() -
      new Date(signals[0].ts).getTime();
    const hoursDuration = totalDuration / (1000 * 60 * 60);

    // High compression = many signals in short time
    return Math.min(1, signals.length / Math.max(1, hoursDuration));
  }

  private calculateEntropy(values: number[]): number {
    if (!values.length) return 0;

    // Simple entropy calculation based on value distribution
    const sum = values.reduce((s, v) => s + v, 0);
    if (sum === 0) return 0;

    const probabilities = values.map((v) => v / sum);
    return -probabilities.reduce((entropy, p) => {
      return p > 0 ? entropy + p * Math.log2(p) : entropy;
    }, 0);
  }
}
