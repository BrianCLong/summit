import { Neo4jService } from '../../db/neo4j';
import { RedisService } from '../../cache/redis';
import logger from '../../utils/logger';
import { randomUUID as uuidv4 } from 'crypto';

export interface NarrativeImpact {
  id: string;
  tenantId: string;
  narrativeId: string;
  title: string;
  description: string;
  impactType:
    | 'information_flow'
    | 'belief_shift'
    | 'behavioral_change'
    | 'network_disruption';
  magnitude: number;
  direction: 'upstream' | 'downstream' | 'lateral';
  confidence: number;
  timeframe: string;
  affectedEntities: string[];
  propagationPath: PropagationNode[];
  metadata: Record<string, any>;
  firstDetected: string;
  lastUpdated: string;
}

export interface PropagationNode {
  entityId: string;
  entityType: string;
  impactStrength: number;
  transmissionDelay: number;
  amplificationFactor: number;
  resistanceFactor: number;
}

export interface NarrativeThread {
  threadId: string;
  tenantId: string;
  theme: string;
  keyNarratives: string[];
  evolutionTimeline: NarrativeEvolution[];
  currentState: 'emerging' | 'active' | 'declining' | 'dormant';
  influence: number;
  reach: number;
}

export interface NarrativeEvolution {
  timestamp: string;
  event: string;
  impactMagnitude: number;
  catalysts: string[];
  consequences: string[];
}

export class NarrativeImpactModel {
  private impactThresholds = {
    low: 0.3,
    medium: 0.6,
    high: 0.8,
  };

  constructor(
    private neo4j: Neo4jService,
    private redis: RedisService,
  ) {}

  async analyzeNarrativeImpact(
    tenantId: string,
    signals: any[],
  ): Promise<NarrativeImpact[]> {
    if (!signals.length) return [];

    try {
      logger.info('Starting narrative impact analysis', {
        tenantId,
        signalCount: signals.length,
      });

      // Group signals by narrative indicators
      const narrativeSignals = this.identifyNarrativeSignals(signals);

      // Build narrative impact models
      const impacts: NarrativeImpact[] = [];

      for (const [narrativeKey, narrativeSigs] of narrativeSignals.entries()) {
        const impact = await this.buildNarrativeImpact(
          tenantId,
          narrativeKey,
          narrativeSigs,
        );
        if (impact) {
          impacts.push(impact);
        }
      }

      // Analyze narrative interactions and dependencies
      const enhancedImpacts = await this.analyzeNarrativeInteractions(
        tenantId,
        impacts,
      );

      // Store in Neo4j
      await this.storeNarrativeImpacts(tenantId, enhancedImpacts);

      // Update cache
      await this.cacheNarrativeImpacts(tenantId, enhancedImpacts);

      logger.info('Narrative impact analysis completed', {
        tenantId,
        impactCount: enhancedImpacts.length,
        highImpactCount: enhancedImpacts.filter(
          (i) => i.magnitude >= this.impactThresholds.high,
        ).length,
      });

      return enhancedImpacts;
    } catch (error) {
      logger.error('Failed to analyze narrative impact', { error, tenantId });
      throw error;
    }
  }

  async getNarrativeImpacts(
    tenantId: string,
    options: {
      limit?: number;
      minMagnitude?: number;
      impactTypes?: string[];
      timeRange?: { start: string; end: string };
    } = {},
  ): Promise<NarrativeImpact[]> {
    const { limit = 20, minMagnitude = 0.1, impactTypes, timeRange } = options;

    try {
      // Try cache first
      const cacheKey = `narrative_impacts:${tenantId}:${JSON.stringify(options)}`;
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Query from Neo4j
      const session = this.neo4j.getSession();
      try {
        let whereClause = 'ni.magnitude >= $minMagnitude';
        const params: any = { tenantId, minMagnitude };

        if (impactTypes?.length) {
          whereClause += ' AND ni.impact_type IN $impactTypes';
          params.impactTypes = impactTypes;
        }

        if (timeRange) {
          whereClause +=
            ' AND ni.last_updated >= datetime($startTime) AND ni.last_updated <= datetime($endTime)';
          params.startTime = timeRange.start;
          params.endTime = timeRange.end;
        }

        const result = await session.executeRead(async (tx) => {
          return await tx.run(
            `
            MATCH (t:Tenant {tenant_id: $tenantId})-[:HAS_NARRATIVE]->(ni:NarrativeImpact)
            WHERE ${whereClause}
            OPTIONAL MATCH (ni)-[:AFFECTS]->(e:Entity)
            WITH ni, collect(e.entity_id) as affectedEntities
            RETURN ni {
              .*,
              affectedEntities: affectedEntities
            }
            ORDER BY ni.magnitude DESC, ni.last_updated DESC
            LIMIT $limit
          `,
            { ...params, limit },
          );
        });

        const impacts = result.records.map((record) => {
          const ni = record.get('ni');
          return {
            id: ni.impact_id,
            tenantId: ni.tenant_id,
            narrativeId: ni.narrative_id,
            title: ni.title,
            description: ni.description,
            impactType: ni.impact_type,
            magnitude: ni.magnitude,
            direction: ni.direction,
            confidence: ni.confidence,
            timeframe: ni.timeframe,
            affectedEntities: ni.affectedEntities || [],
            propagationPath: JSON.parse(ni.propagation_path || '[]'),
            metadata: JSON.parse(ni.metadata || '{}'),
            firstDetected: ni.first_detected,
            lastUpdated: ni.last_updated,
          };
        });

        // Cache results
        await this.redis.setex(cacheKey, 300, JSON.stringify(impacts));
        return impacts;
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Failed to get narrative impacts', {
        error,
        tenantId,
        options,
      });
      return [];
    }
  }

  async trackNarrativeThreads(tenantId: string): Promise<NarrativeThread[]> {
    const session = this.neo4j.getSession();

    try {
      // Get narrative threads from graph analysis
      const result = await session.executeRead(async (tx) => {
        return await tx.run(
          `
          MATCH (t:Tenant {tenant_id: $tenantId})-[:HAS_NARRATIVE]->(ni:NarrativeImpact)
          WITH ni, split(ni.narrative_id, '_')[0] as theme
          WITH theme, collect(ni.narrative_id) as narratives, 
               avg(ni.magnitude) as avgInfluence,
               count(DISTINCT ni.affected_entities) as reach,
               collect({
                 timestamp: ni.last_updated,
                 event: ni.title,
                 magnitude: ni.magnitude
               }) as evolution
          RETURN {
            threadId: randomUUID(),
            theme: theme,
            keyNarratives: narratives,
            evolutionTimeline: evolution,
            influence: avgInfluence,
            reach: reach,
            currentState: CASE
              WHEN avgInfluence >= 0.8 THEN 'active'
              WHEN avgInfluence >= 0.5 THEN 'emerging'
              WHEN avgInfluence >= 0.2 THEN 'declining'
              ELSE 'dormant'
            END
          } as thread
        `,
          { tenantId },
        );
      });

      const threads = result.records.map((record) => {
        const thread = record.get('thread');
        return {
          threadId: thread.threadId,
          tenantId,
          theme: thread.theme,
          keyNarratives: thread.keyNarratives,
          evolutionTimeline: thread.evolutionTimeline.map((evt: any) => ({
            timestamp: evt.timestamp,
            event: evt.event,
            impactMagnitude: evt.magnitude,
            catalysts: [], // Would be populated from detailed analysis
            consequences: [],
          })),
          currentState: thread.currentState,
          influence: thread.influence,
          reach: thread.reach,
        };
      });

      return threads;
    } finally {
      await session.close();
    }
  }

  async predictNarrativeEvolution(
    tenantId: string,
    narrativeId: string,
    timeHorizon: string = '7d',
  ): Promise<{
    predictions: any[];
    confidence: number;
    riskFactors: string[];
  }> {
    try {
      // Get historical narrative data
      const historicalData = await this.getHistoricalNarrativeData(
        tenantId,
        narrativeId,
      );

      // Simple trend analysis for prediction
      const predictions = this.generateNarrativePredictions(
        historicalData,
        timeHorizon,
      );

      // Calculate prediction confidence
      const confidence = this.calculatePredictionConfidence(
        historicalData,
        predictions,
      );

      // Identify risk factors
      const riskFactors = this.identifyNarrativeRiskFactors(
        historicalData,
        predictions,
      );

      return {
        predictions,
        confidence,
        riskFactors,
      };
    } catch (error) {
      logger.error('Failed to predict narrative evolution', {
        error,
        tenantId,
        narrativeId,
      });
      return {
        predictions: [],
        confidence: 0,
        riskFactors: ['prediction_error'],
      };
    }
  }

  private identifyNarrativeSignals(signals: any[]): Map<string, any[]> {
    const narrativeSignals = new Map<string, any[]>();

    // Define narrative signal patterns
    const narrativeIndicators = {
      information_flow: ['communication', 'message_spread', 'content_viral'],
      belief_shift: ['opinion_change', 'sentiment_shift', 'perception_change'],
      behavioral_change: [
        'action_pattern',
        'engagement_change',
        'participation_shift',
      ],
      network_disruption: [
        'connection_break',
        'influence_block',
        'communication_gap',
      ],
    };

    signals.forEach((signal) => {
      for (const [narrativeType, indicators] of Object.entries(
        narrativeIndicators,
      )) {
        if (
          indicators.some(
            (indicator) =>
              signal.type.includes(indicator) ||
              signal.source.includes(indicator),
          )
        ) {
          const key = `${narrativeType}_${signal.source}`;
          if (!narrativeSignals.has(key)) {
            narrativeSignals.set(key, []);
          }
          narrativeSignals.get(key)!.push(signal);
        }
      }
    });

    return narrativeSignals;
  }

  private async buildNarrativeImpact(
    tenantId: string,
    narrativeKey: string,
    signals: any[],
  ): Promise<NarrativeImpact | null> {
    if (signals.length < 3) return null; // Need minimum signals for analysis

    const [impactType, source] = narrativeKey.split('_');

    // Calculate impact magnitude
    const magnitude = this.calculateImpactMagnitude(signals);

    if (magnitude < this.impactThresholds.low) return null;

    // Determine impact direction
    const direction = this.determineImpactDirection(signals);

    // Build propagation path
    const propagationPath = await this.buildPropagationPath(tenantId, signals);

    // Calculate confidence
    const confidence = this.calculateNarrativeConfidence(signals, magnitude);

    const impact: NarrativeImpact = {
      id: uuidv4(),
      tenantId,
      narrativeId: `${impactType}_${Date.now()}`,
      title: this.generateNarrativeTitle(impactType, signals),
      description: this.generateNarrativeDescription(
        impactType,
        signals,
        magnitude,
      ),
      impactType: impactType as any,
      magnitude,
      direction,
      confidence,
      timeframe: this.calculateTimeframe(signals),
      affectedEntities: [...new Set(signals.map((s) => s.source))],
      propagationPath,
      metadata: {
        signalCount: signals.length,
        sourcePattern: source,
        analysisTimestamp: new Date().toISOString(),
      },
      firstDetected: signals.reduce(
        (earliest, s) => (s.ts < earliest ? s.ts : earliest),
        signals[0].ts,
      ),
      lastUpdated: new Date().toISOString(),
    };

    return impact;
  }

  private calculateImpactMagnitude(signals: any[]): number {
    if (!signals.length) return 0;

    // Weighted average of signal values with temporal decay
    const now = Date.now();
    const weights = signals.map((signal) => {
      const age = now - new Date(signal.ts).getTime();
      const daysDiff = age / (1000 * 60 * 60 * 24);
      return Math.exp(-daysDiff / 7); // 7-day half-life for temporal decay
    });

    const weightedSum = signals.reduce((sum, signal, i) => {
      return sum + signal.value * signal.weight * weights[i];
    }, 0);

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    return totalWeight > 0 ? Math.min(1, weightedSum / totalWeight) : 0;
  }

  private determineImpactDirection(
    signals: any[],
  ): 'upstream' | 'downstream' | 'lateral' {
    // Analyze signal flow patterns to determine direction
    const sources = signals.map((s) => s.source);
    const targets = signals.map((s) => s.target || s.source);

    const sourceSet = new Set(sources);
    const targetSet = new Set(targets);

    // Simple heuristics for direction
    if (sourceSet.size < targetSet.size) return 'downstream'; // One-to-many
    if (sourceSet.size > targetSet.size) return 'upstream'; // Many-to-one
    return 'lateral'; // Many-to-many or equal
  }

  private async buildPropagationPath(
    tenantId: string,
    signals: any[],
  ): Promise<PropagationNode[]> {
    const entities = new Map<string, any[]>();

    // Group signals by entity
    signals.forEach((signal) => {
      const entityId = signal.source;
      if (!entities.has(entityId)) {
        entities.set(entityId, []);
      }
      entities.get(entityId)!.push(signal);
    });

    // Build propagation nodes
    const nodes: PropagationNode[] = [];

    for (const [entityId, entitySignals] of entities.entries()) {
      const impactStrength =
        entitySignals.reduce((sum, s) => sum + s.value * s.weight, 0) /
        entitySignals.length;

      // Calculate transmission characteristics
      const transmissionDelay = this.calculateTransmissionDelay(entitySignals);
      const amplificationFactor =
        this.calculateAmplificationFactor(entitySignals);
      const resistanceFactor = this.calculateResistanceFactor(entitySignals);

      nodes.push({
        entityId,
        entityType: this.inferEntityType(entitySignals),
        impactStrength,
        transmissionDelay,
        amplificationFactor,
        resistanceFactor,
      });
    }

    // Sort by impact strength
    return nodes.sort((a, b) => b.impactStrength - a.impactStrength);
  }

  private calculateNarrativeConfidence(
    signals: any[],
    magnitude: number,
  ): number {
    // Confidence based on signal consistency and magnitude
    const values = signals.map((s) => s.value * s.weight);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const consistency = Math.max(0, 1 - Math.sqrt(variance) / mean);

    return consistency * 0.6 + magnitude * 0.4;
  }

  private generateNarrativeTitle(impactType: string, signals: any[]): string {
    const titleTemplates = {
      information_flow: `Information Flow Pattern Detected (${signals.length} signals)`,
      belief_shift: `Belief System Changes Identified (${signals.length} signals)`,
      behavioral_change: `Behavioral Pattern Evolution (${signals.length} signals)`,
      network_disruption: `Network Communication Disruption (${signals.length} signals)`,
    };

    return (
      titleTemplates[impactType as keyof typeof titleTemplates] ||
      `Narrative Impact Detected (${signals.length} signals)`
    );
  }

  private generateNarrativeDescription(
    impactType: string,
    signals: any[],
    magnitude: number,
  ): string {
    const sources = [...new Set(signals.map((s) => s.source))];
    const timeSpan = this.calculateTimeSpan(signals);

    return `${impactType.replace('_', ' ')} impact detected across ${sources.length} entities over ${timeSpan}. Impact magnitude: ${(magnitude * 100).toFixed(1)}%.`;
  }

  private calculateTimeframe(signals: any[]): string {
    if (signals.length < 2) return 'instant';

    const start = new Date(
      signals.reduce(
        (earliest, s) => (s.ts < earliest ? s.ts : earliest),
        signals[0].ts,
      ),
    );
    const end = new Date(
      signals.reduce(
        (latest, s) => (s.ts > latest ? s.ts : latest),
        signals[0].ts,
      ),
    );
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (diffHours < 1) return 'immediate';
    if (diffHours < 24) return `${Math.ceil(diffHours)}h`;
    return `${Math.ceil(diffHours / 24)}d`;
  }

  private async analyzeNarrativeInteractions(
    tenantId: string,
    impacts: NarrativeImpact[],
  ): Promise<NarrativeImpact[]> {
    // Analyze how narratives influence each other
    const enhancedImpacts = [...impacts];

    for (let i = 0; i < impacts.length; i++) {
      for (let j = i + 1; j < impacts.length; j++) {
        const impactA = impacts[i];
        const impactB = impacts[j];

        // Check for entity overlap
        const sharedEntities = impactA.affectedEntities.filter((e) =>
          impactB.affectedEntities.includes(e),
        );

        if (sharedEntities.length > 0) {
          // Enhance both impacts with interaction data
          enhancedImpacts[i].metadata.interactions =
            enhancedImpacts[i].metadata.interactions || [];
          enhancedImpacts[i].metadata.interactions.push({
            relatedNarrative: impactB.narrativeId,
            sharedEntities: sharedEntities.length,
            interactionStrength:
              sharedEntities.length /
              Math.max(
                impactA.affectedEntities.length,
                impactB.affectedEntities.length,
              ),
          });

          enhancedImpacts[j].metadata.interactions =
            enhancedImpacts[j].metadata.interactions || [];
          enhancedImpacts[j].metadata.interactions.push({
            relatedNarrative: impactA.narrativeId,
            sharedEntities: sharedEntities.length,
            interactionStrength:
              sharedEntities.length /
              Math.max(
                impactA.affectedEntities.length,
                impactB.affectedEntities.length,
              ),
          });
        }
      }
    }

    return enhancedImpacts;
  }

  private async storeNarrativeImpacts(
    tenantId: string,
    impacts: NarrativeImpact[],
  ): Promise<void> {
    if (!impacts.length) return;

    const session = this.neo4j.getSession();
    try {
      await session.executeWrite(async (tx) => {
        for (const impact of impacts) {
          await tx.run(
            `
            MATCH (t:Tenant {tenant_id: $tenantId})
            MERGE (ni:NarrativeImpact {impact_id: $impactId})
            SET ni += {
              tenant_id: $tenantId,
              narrative_id: $narrativeId,
              title: $title,
              description: $description,
              impact_type: $impactType,
              magnitude: $magnitude,
              direction: $direction,
              confidence: $confidence,
              timeframe: $timeframe,
              propagation_path: $propagationPath,
              metadata: $metadata,
              first_detected: datetime($firstDetected),
              last_updated: datetime($lastUpdated)
            }
            MERGE (t)-[:HAS_NARRATIVE]->(ni)
          `,
            {
              tenantId,
              impactId: impact.id,
              narrativeId: impact.narrativeId,
              title: impact.title,
              description: impact.description,
              impactType: impact.impactType,
              magnitude: impact.magnitude,
              direction: impact.direction,
              confidence: impact.confidence,
              timeframe: impact.timeframe,
              propagationPath: JSON.stringify(impact.propagationPath),
              metadata: JSON.stringify(impact.metadata),
              firstDetected: impact.firstDetected,
              lastUpdated: impact.lastUpdated,
            },
          );

          // Link to affected entities
          for (const entityId of impact.affectedEntities) {
            await tx.run(
              `
              MATCH (ni:NarrativeImpact {impact_id: $impactId})
              MERGE (e:Entity {entity_id: $entityId})
              MERGE (ni)-[:AFFECTS]->(e)
            `,
              { impactId: impact.id, entityId },
            );
          }
        }
      });
    } finally {
      await session.close();
    }
  }

  private async cacheNarrativeImpacts(
    tenantId: string,
    impacts: NarrativeImpact[],
  ): Promise<void> {
    const cacheKey = `narrative_impacts:${tenantId}:latest`;
    await this.redis.setex(cacheKey, 600, JSON.stringify(impacts));
  }

  // Helper methods
  private calculateTransmissionDelay(signals: any[]): number {
    if (signals.length < 2) return 0;

    const intervals = [];
    for (let i = 1; i < signals.length; i++) {
      const delay =
        new Date(signals[i].ts).getTime() -
        new Date(signals[i - 1].ts).getTime();
      intervals.push(delay);
    }

    return (
      intervals.reduce((sum, delay) => sum + delay, 0) /
      intervals.length /
      (1000 * 60)
    ); // Average delay in minutes
  }

  private calculateAmplificationFactor(signals: any[]): number {
    // Analyze signal strength progression
    const values = signals.map((s) => s.value * s.weight);
    if (values.length < 2) return 1;

    let amplificationSum = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] > 0) {
        amplificationSum += values[i] / values[i - 1];
      }
    }

    return amplificationSum / (values.length - 1);
  }

  private calculateResistanceFactor(signals: any[]): number {
    // Measure consistency (higher consistency = lower resistance)
    const values = signals.map((s) => s.value * s.weight);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    return Math.sqrt(variance) / Math.max(mean, 0.1); // Normalized variance
  }

  private inferEntityType(signals: any[]): string {
    // Simple entity type inference based on signal patterns
    const sources = signals.map((s) => s.source);
    const uniqueSources = new Set(sources);

    if (uniqueSources.size === 1) return 'individual';
    if (uniqueSources.size < sources.length * 0.3) return 'group';
    return 'network';
  }

  private calculateTimeSpan(signals: any[]): string {
    if (signals.length < 2) return '0m';

    const start = new Date(
      signals.reduce(
        (earliest, s) => (s.ts < earliest ? s.ts : earliest),
        signals[0].ts,
      ),
    );
    const end = new Date(
      signals.reduce(
        (latest, s) => (s.ts > latest ? s.ts : latest),
        signals[0].ts,
      ),
    );
    const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

    if (diffMinutes < 60) return `${Math.ceil(diffMinutes)}m`;
    if (diffMinutes < 1440) return `${Math.ceil(diffMinutes / 60)}h`;
    return `${Math.ceil(diffMinutes / 1440)}d`;
  }

  private async getHistoricalNarrativeData(
    tenantId: string,
    narrativeId: string,
  ): Promise<any[]> {
    // Placeholder for historical data retrieval
    return [];
  }

  private generateNarrativePredictions(
    historicalData: any[],
    timeHorizon: string,
  ): any[] {
    // Placeholder for prediction generation
    return [];
  }

  private calculatePredictionConfidence(
    historicalData: any[],
    predictions: any[],
  ): number {
    // Placeholder for confidence calculation
    return 0.5;
  }

  private identifyNarrativeRiskFactors(
    historicalData: any[],
    predictions: any[],
  ): string[] {
    // Placeholder for risk factor identification
    return ['insufficient_historical_data'];
  }
}
