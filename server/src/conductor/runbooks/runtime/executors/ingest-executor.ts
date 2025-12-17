/**
 * Ingest Step Executor
 *
 * Handles indicator ingestion for CTI workflows.
 *
 * @module runbooks/runtime/executors/ingest-executor
 */

import { BaseStepExecutor } from './base';
import {
  StepExecutorContext,
  StepExecutorResult,
  RunbookActionType,
  IndicatorIngestService,
} from '../types';

/**
 * Indicator types supported for ingestion
 */
export type IndicatorType = 'ip' | 'domain' | 'hash' | 'url' | 'email' | 'file_path';

/**
 * Enriched indicator data
 */
export interface EnrichedIndicator {
  id: string;
  value: string;
  type: IndicatorType;
  reputation?: 'malicious' | 'suspicious' | 'clean' | 'unknown';
  firstSeen?: string;
  lastSeen?: string;
  tags?: string[];
  context?: string;
}

/**
 * Default indicator ingest service implementation
 */
export class DefaultIndicatorIngestService implements IndicatorIngestService {
  async ingestIndicators(input: {
    indicators: string[];
    indicatorTypes?: string[];
    caseId?: string;
    source?: string;
  }): Promise<{
    indicatorNodeIds: string[];
    enrichedIndicators: EnrichedIndicator[];
  }> {
    const enrichedIndicators: EnrichedIndicator[] = input.indicators.map((value, index) => {
      const type = this.detectIndicatorType(value);
      return {
        id: `ind-${Date.now()}-${index}`,
        value,
        type,
        reputation: this.assessReputation(value, type),
        firstSeen: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastSeen: new Date().toISOString(),
        tags: this.generateTags(type),
        context: input.source || 'unknown',
      };
    });

    return {
      indicatorNodeIds: enrichedIndicators.map((i) => i.id),
      enrichedIndicators,
    };
  }

  private detectIndicatorType(value: string): IndicatorType {
    // IP address pattern
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
      return 'ip';
    }
    // Domain pattern
    if (/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/.test(value)) {
      return 'domain';
    }
    // Hash patterns (MD5, SHA1, SHA256)
    if (/^[a-fA-F0-9]{32}$/.test(value)) {
      return 'hash';
    }
    if (/^[a-fA-F0-9]{40}$/.test(value)) {
      return 'hash';
    }
    if (/^[a-fA-F0-9]{64}$/.test(value)) {
      return 'hash';
    }
    // URL pattern
    if (/^https?:\/\//.test(value)) {
      return 'url';
    }
    // Email pattern
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'email';
    }
    return 'file_path';
  }

  private assessReputation(
    value: string,
    type: IndicatorType
  ): 'malicious' | 'suspicious' | 'clean' | 'unknown' {
    // Simulated reputation scoring
    const random = Math.random();
    if (random < 0.4) return 'malicious';
    if (random < 0.6) return 'suspicious';
    if (random < 0.8) return 'clean';
    return 'unknown';
  }

  private generateTags(type: IndicatorType): string[] {
    const baseTags = ['cti', 'indicator'];
    switch (type) {
      case 'ip':
        return [...baseTags, 'network', 'infrastructure'];
      case 'domain':
        return [...baseTags, 'network', 'dns'];
      case 'hash':
        return [...baseTags, 'malware', 'file'];
      case 'url':
        return [...baseTags, 'web', 'phishing'];
      case 'email':
        return [...baseTags, 'communication', 'phishing'];
      default:
        return baseTags;
    }
  }
}

/**
 * Ingest step executor for CTI indicator ingestion
 */
export class IngestStepExecutor extends BaseStepExecutor {
  readonly actionType: RunbookActionType = 'INGEST';

  constructor(
    private readonly ingestService: IndicatorIngestService = new DefaultIndicatorIngestService()
  ) {
    super();
  }

  async execute(ctx: StepExecutorContext): Promise<StepExecutorResult> {
    try {
      // Get indicators from input or config
      const indicators = this.getInput<string[]>(ctx, 'indicators', []) ||
        this.getConfig<string[]>(ctx, 'indicators', []);

      if (indicators.length === 0) {
        return this.failure('No indicators provided for ingestion');
      }

      const caseId = this.getInput<string>(ctx, 'caseId', '');
      const source = this.getInput<string>(ctx, 'source', 'manual');

      // Call ingest service
      const result = await this.ingestService.ingestIndicators({
        indicators,
        caseId: caseId || undefined,
        source,
      });

      // Create evidence
      const evidence = this.createEvidence(
        'threat_indicators',
        {
          indicators: result.enrichedIndicators,
          count: result.enrichedIndicators.length,
        },
        [
          this.createCitation(
            source || 'Manual Input',
            undefined,
            ctx.userId,
            { caseId, timestamp: new Date().toISOString() }
          ),
        ],
        {
          indicatorCount: result.enrichedIndicators.length,
          qualityScore: this.calculateQualityScore(result.enrichedIndicators),
        }
      );

      // Create proof
      const proof = this.createProof({
        indicators,
        enrichedCount: result.enrichedIndicators.length,
        timestamp: new Date().toISOString(),
      });
      evidence.proofs.push(proof);

      return this.success(
        {
          indicatorNodeIds: result.indicatorNodeIds,
          enrichedIndicators: result.enrichedIndicators,
          indicators,
          indicatorCount: indicators.length,
        },
        {
          evidence: [evidence],
          citations: evidence.citations,
          proofs: [proof],
          kpis: {
            indicatorCount: indicators.length,
            enrichedCount: result.enrichedIndicators.length,
            maliciousCount: result.enrichedIndicators.filter(
              (i) => i.reputation === 'malicious'
            ).length,
          },
        }
      );
    } catch (error) {
      return this.failure(
        error instanceof Error ? error.message : 'Failed to ingest indicators'
      );
    }
  }

  private calculateQualityScore(indicators: EnrichedIndicator[]): number {
    if (indicators.length === 0) return 0;

    let score = 0;
    for (const ind of indicators) {
      if (ind.reputation && ind.reputation !== 'unknown') score += 0.3;
      if (ind.firstSeen) score += 0.2;
      if (ind.lastSeen) score += 0.2;
      if (ind.tags && ind.tags.length > 0) score += 0.3;
    }
    return score / indicators.length;
  }
}
