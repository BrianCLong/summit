import { getPostgresPool } from '../db/postgres.js';
import { otelService } from '../middleware/observability/otel-tracing.js';
import { z } from 'zod';

interface SemanticSLO {
  id: string;
  name: string;
  description: string;
  metricType:
    | 'accuracy'
    | 'relevance'
    | 'coherence'
    | 'toxicity'
    | 'bias'
    | 'hallucination'
    | 'latency'
    | 'cost';
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  timeWindow: number; // minutes
  evaluationMethod: 'automated' | 'human' | 'hybrid';
  criticality: 'low' | 'medium' | 'high' | 'critical';
}

interface EvaluationResult {
  id: string;
  modelId: string;
  inputText: string;
  outputText: string;
  groundTruth?: string;
  evaluationId: string;
  metrics: Record<string, number>;
  sloViolations: string[];
  timestamp: Date;
  metadata: any;
}

interface QualityReport {
  id: string;
  tenantId: string;
  modelId: string;
  timeRange: { start: Date; end: Date };
  overallScore: number;
  sloCompliance: number;
  metrics: Record<string, any>;
  recommendations: string[];
  regressionDetected: boolean;
}

const SemanticSLOSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  metricType: z.enum([
    'accuracy',
    'relevance',
    'coherence',
    'toxicity',
    'bias',
    'hallucination',
    'latency',
    'cost',
  ]),
  threshold: z.number().min(0).max(1),
  operator: z.enum(['gt', 'lt', 'eq', 'gte', 'lte']),
  timeWindow: z.number().min(1).max(10080), // 1 minute to 1 week
  evaluationMethod: z.enum(['automated', 'human', 'hybrid']),
  criticality: z.enum(['low', 'medium', 'high', 'critical']),
});

const EvaluationRequestSchema = z.object({
  modelId: z.string().min(1),
  inputText: z.string().min(1),
  outputText: z.string().min(1),
  groundTruth: z.string().optional(),
  evaluationTypes: z
    .array(z.string())
    .default(['accuracy', 'relevance', 'coherence']),
  metadata: z.object({}).passthrough().optional(),
});

const BatchEvaluationSchema = z.object({
  modelId: z.string().min(1),
  dataset: z.array(
    z.object({
      input: z.string(),
      output: z.string(),
      groundTruth: z.string().optional(),
      metadata: z.object({}).passthrough().optional(),
    }),
  ),
  evaluationTypes: z
    .array(z.string())
    .default(['accuracy', 'relevance', 'coherence']),
  sloIds: z.array(z.string()).optional(),
});

export class QualityEvaluationPlatform {
  private evaluators: Map<string, any> = new Map();

  constructor() {
    this.initializeEvaluators();
  }

  private initializeEvaluators() {
    // Semantic evaluators using various techniques
    this.evaluators.set('accuracy', {
      evaluate: this.evaluateAccuracy.bind(this),
      type: 'automated',
      description: 'Semantic accuracy against ground truth',
    });

    this.evaluators.set('relevance', {
      evaluate: this.evaluateRelevance.bind(this),
      type: 'automated',
      description: 'Contextual relevance of response',
    });

    this.evaluators.set('coherence', {
      evaluate: this.evaluateCoherence.bind(this),
      type: 'automated',
      description: 'Logical coherence and flow',
    });

    this.evaluators.set('toxicity', {
      evaluate: this.evaluateToxicity.bind(this),
      type: 'automated',
      description: 'Content safety and toxicity detection',
    });

    this.evaluators.set('bias', {
      evaluate: this.evaluateBias.bind(this),
      type: 'automated',
      description: 'Bias detection across demographics',
    });

    this.evaluators.set('hallucination', {
      evaluate: this.evaluateHallucination.bind(this),
      type: 'automated',
      description: 'Factual accuracy and hallucination detection',
    });

    this.evaluators.set('latency', {
      evaluate: this.evaluateLatency.bind(this),
      type: 'automated',
      description: 'Response time performance',
    });

    this.evaluators.set('cost', {
      evaluate: this.evaluateCost.bind(this),
      type: 'automated',
      description: 'Cost per inference evaluation',
    });
  }

  async createSemanticSLO(tenantId: string, sloConfig: any): Promise<string> {
    const span = otelService.createSpan('quality-evaluation.create-slo');

    try {
      const validatedConfig = SemanticSLOSchema.parse(sloConfig);
      const pool = getPostgresPool();
      const sloId = `slo-${tenantId}-${Date.now()}`;

      await pool.query(
        `INSERT INTO semantic_slos (
          id, tenant_id, name, description, metric_type, threshold, 
          operator, time_window, evaluation_method, criticality, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
        [
          sloId,
          tenantId,
          validatedConfig.name,
          validatedConfig.description,
          validatedConfig.metricType,
          validatedConfig.threshold,
          validatedConfig.operator,
          validatedConfig.timeWindow,
          validatedConfig.evaluationMethod,
          validatedConfig.criticality,
        ],
      );

      // Create audit entry
      await pool.query(
        `INSERT INTO quality_audit (
          tenant_id, action, resource_id, metadata, created_at
        ) VALUES ($1, $2, $3, $4, now())`,
        [
          tenantId,
          'slo_created',
          sloId,
          JSON.stringify({
            name: validatedConfig.name,
            metricType: validatedConfig.metricType,
            threshold: validatedConfig.threshold,
          }),
        ],
      );

      otelService.addSpanAttributes({
        'quality-evaluation.tenant_id': tenantId,
        'quality-evaluation.slo_id': sloId,
        'quality-evaluation.metric_type': validatedConfig.metricType,
      });

      return sloId;
    } catch (error: any) {
      console.error('SLO creation failed:', error);
      throw error;
    } finally {
      span?.end();
    }
  }

  async evaluateSingle(
    tenantId: string,
    request: any,
  ): Promise<EvaluationResult> {
    const span = otelService.createSpan('quality-evaluation.evaluate-single');

    try {
      const validatedRequest = EvaluationRequestSchema.parse(request);
      const pool = getPostgresPool();
      const evaluationId = `eval-${tenantId}-${Date.now()}`;

      // Run all requested evaluations
      const metrics: Record<string, number> = {};
      const evaluationPromises = validatedRequest.evaluationTypes.map(
        async (evalType) => {
          if (this.evaluators.has(evalType)) {
            const evaluator = this.evaluators.get(evalType);
            const score = await evaluator.evaluate(
              validatedRequest.inputText,
              validatedRequest.outputText,
              validatedRequest.groundTruth,
              validatedRequest.metadata,
            );
            metrics[evalType] = score;
          }
        },
      );

      await Promise.all(evaluationPromises);

      // Check SLO violations
      const slos = await this.getActiveSLOs(tenantId);
      const sloViolations = this.checkSLOViolations(metrics, slos);

      const result: EvaluationResult = {
        id: evaluationId,
        modelId: validatedRequest.modelId,
        inputText: validatedRequest.inputText,
        outputText: validatedRequest.outputText,
        groundTruth: validatedRequest.groundTruth,
        evaluationId,
        metrics,
        sloViolations,
        timestamp: new Date(),
        metadata: validatedRequest.metadata || {},
      };

      // Store evaluation result
      await pool.query(
        `INSERT INTO evaluation_results (
          id, tenant_id, model_id, input_text, output_text, ground_truth,
          metrics, slo_violations, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
        [
          evaluationId,
          tenantId,
          validatedRequest.modelId,
          validatedRequest.inputText,
          validatedRequest.outputText,
          validatedRequest.groundTruth,
          JSON.stringify(metrics),
          JSON.stringify(sloViolations),
          JSON.stringify(validatedRequest.metadata || {}),
        ],
      );

      // Create alerts for critical SLO violations
      if (sloViolations.length > 0) {
        await this.createSLOAlerts(
          tenantId,
          validatedRequest.modelId,
          sloViolations,
        );
      }

      otelService.addSpanAttributes({
        'quality-evaluation.tenant_id': tenantId,
        'quality-evaluation.model_id': validatedRequest.modelId,
        'quality-evaluation.metrics_count': Object.keys(metrics).length,
        'quality-evaluation.slo_violations': sloViolations.length,
      });

      return result;
    } catch (error: any) {
      console.error('Single evaluation failed:', error);
      throw error;
    } finally {
      span?.end();
    }
  }

  async evaluateBatch(
    tenantId: string,
    request: any,
  ): Promise<{
    evaluationId: string;
    results: EvaluationResult[];
    summary: any;
  }> {
    const span = otelService.createSpan('quality-evaluation.evaluate-batch');

    try {
      const validatedRequest = BatchEvaluationSchema.parse(request);
      const evaluationId = `batch-eval-${tenantId}-${Date.now()}`;

      // Process each item in the dataset
      const results: EvaluationResult[] = [];
      const batchMetrics: Record<string, number[]> = {};

      for (const item of validatedRequest.dataset) {
        const singleRequest = {
          modelId: validatedRequest.modelId,
          inputText: item.input,
          outputText: item.output,
          groundTruth: item.groundTruth,
          evaluationTypes: validatedRequest.evaluationTypes,
          metadata: item.metadata,
        };

        const result = await this.evaluateSingle(tenantId, singleRequest);
        results.push(result);

        // Collect metrics for aggregation
        Object.entries(result.metrics).forEach(([metric, value]) => {
          if (!batchMetrics[metric]) batchMetrics[metric] = [];
          batchMetrics[metric].push(value);
        });
      }

      // Calculate summary statistics
      const summary = {
        totalEvaluations: results.length,
        averageScores: this.calculateAverageScores(batchMetrics),
        sloComplianceRate: this.calculateSLOComplianceRate(results),
        regressionDetected: await this.detectRegression(
          tenantId,
          validatedRequest.modelId,
          batchMetrics,
        ),
        distributionStats: this.calculateDistributionStats(batchMetrics),
      };

      // Store batch evaluation summary
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO batch_evaluations (
          id, tenant_id, model_id, dataset_size, summary, created_at
        ) VALUES ($1, $2, $3, $4, $5, now())`,
        [
          evaluationId,
          tenantId,
          validatedRequest.modelId,
          results.length,
          JSON.stringify(summary),
        ],
      );

      otelService.addSpanAttributes({
        'quality-evaluation.tenant_id': tenantId,
        'quality-evaluation.model_id': validatedRequest.modelId,
        'quality-evaluation.batch_size': results.length,
        'quality-evaluation.regression_detected': summary.regressionDetected,
      });

      return { evaluationId, results, summary };
    } catch (error: any) {
      console.error('Batch evaluation failed:', error);
      throw error;
    } finally {
      span?.end();
    }
  }

  async generateQualityReport(
    tenantId: string,
    modelId: string,
    timeRangeHours: number = 24,
  ): Promise<QualityReport> {
    const span = otelService.createSpan('quality-evaluation.generate-report');

    try {
      const pool = getPostgresPool();
      const endTime = new Date();
      const startTime = new Date(
        endTime.getTime() - timeRangeHours * 60 * 60 * 1000,
      );

      // Get evaluation results for time period
      const evaluationsResult = await pool.query(
        `SELECT * FROM evaluation_results 
         WHERE tenant_id = $1 AND model_id = $2 
         AND created_at BETWEEN $3 AND $4
         ORDER BY created_at DESC`,
        [tenantId, modelId, startTime.toISOString(), endTime.toISOString()],
      );

      const evaluations = evaluationsResult.rows;

      if (evaluations.length === 0) {
        throw new Error(
          'No evaluation data found for the specified time range',
        );
      }

      // Aggregate metrics
      const aggregatedMetrics = this.aggregateMetrics(evaluations);

      // Calculate SLO compliance
      const sloCompliance = this.calculateSLOCompliance(evaluations);

      // Calculate overall quality score (weighted average of key metrics)
      const overallScore = this.calculateOverallScore(aggregatedMetrics);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        tenantId,
        modelId,
        aggregatedMetrics,
        sloCompliance,
      );

      // Check for regressions
      const regressionDetected = await this.detectRecentRegression(
        tenantId,
        modelId,
      );

      const report: QualityReport = {
        id: `report-${tenantId}-${modelId}-${Date.now()}`,
        tenantId,
        modelId,
        timeRange: { start: startTime, end: endTime },
        overallScore,
        sloCompliance,
        metrics: aggregatedMetrics,
        recommendations,
        regressionDetected,
      };

      // Store report
      await pool.query(
        `INSERT INTO quality_reports (
          id, tenant_id, model_id, time_range_start, time_range_end,
          overall_score, slo_compliance, metrics, recommendations, regression_detected, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
        [
          report.id,
          tenantId,
          modelId,
          startTime.toISOString(),
          endTime.toISOString(),
          overallScore,
          sloCompliance,
          JSON.stringify(aggregatedMetrics),
          JSON.stringify(recommendations),
          regressionDetected,
        ],
      );

      return report;
    } catch (error: any) {
      console.error('Quality report generation failed:', error);
      throw error;
    } finally {
      span?.end();
    }
  }

  async getSLODashboard(tenantId: string): Promise<any> {
    const span = otelService.createSpan('quality-evaluation.slo-dashboard');

    try {
      const pool = getPostgresPool();

      // Get all SLOs for tenant
      const slosResult = await pool.query(
        'SELECT * FROM semantic_slos WHERE tenant_id = $1 ORDER BY created_at DESC',
        [tenantId],
      );

      // Get recent SLO violations
      const violationsResult = await pool.query(
        `SELECT model_id, slo_violations, created_at 
         FROM evaluation_results 
         WHERE tenant_id = $1 
         AND JSON_ARRAY_LENGTH(slo_violations) > 0
         AND created_at > now() - interval '24 hours'
         ORDER BY created_at DESC
         LIMIT 100`,
        [tenantId],
      );

      // Calculate SLO health metrics
      const sloHealth = await this.calculateSLOHealth(tenantId);

      return {
        slos: slosResult.rows,
        recentViolations: violationsResult.rows,
        health: sloHealth,
        summary: {
          totalSLOs: slosResult.rows.length,
          recentViolations: violationsResult.rows.length,
          overallHealth: sloHealth.overallHealth,
        },
      };
    } catch (error: any) {
      console.error('SLO dashboard generation failed:', error);
      throw error;
    } finally {
      span?.end();
    }
  }

  // Evaluation methods
  private async evaluateAccuracy(
    input: string,
    output: string,
    groundTruth?: string,
    metadata?: any,
  ): Promise<number> {
    if (!groundTruth) return 0.5; // Default score when no ground truth

    // Semantic similarity using simple approach (in production, use embeddings)
    const similarity = this.calculateStringSimilarity(
      output.toLowerCase(),
      groundTruth.toLowerCase(),
    );

    // Adjust based on metadata context if available
    if (metadata?.expectedAccuracy) {
      return Math.min(1.0, similarity * metadata.expectedAccuracy);
    }

    return similarity;
  }

  private async evaluateRelevance(
    input: string,
    output: string,
    groundTruth?: string,
    metadata?: any,
  ): Promise<number> {
    // Contextual relevance - how well does output address the input
    const inputKeywords = this.extractKeywords(input);
    const outputKeywords = this.extractKeywords(output);

    const relevanceScore = this.calculateKeywordOverlap(
      inputKeywords,
      outputKeywords,
    );

    // Penalize very short or very long responses
    const lengthPenalty = this.calculateLengthPenalty(
      output.length,
      input.length,
    );

    return Math.max(0, relevanceScore - lengthPenalty);
  }

  private async evaluateCoherence(
    input: string,
    output: string,
    groundTruth?: string,
    metadata?: any,
  ): Promise<number> {
    // Logical flow and coherence
    const sentences = output.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    if (sentences.length < 2) return 0.7; // Single sentence gets moderate score

    let coherenceScore = 0.8; // Base score

    // Check for contradictions (simple approach)
    const contradictionPenalty = this.detectSimpleContradictions(sentences);
    coherenceScore -= contradictionPenalty;

    // Check for logical flow
    const flowScore = this.evaluateLogicalFlow(sentences);
    coherenceScore = (coherenceScore + flowScore) / 2;

    return Math.max(0, Math.min(1, coherenceScore));
  }

  private async evaluateToxicity(
    input: string,
    output: string,
    groundTruth?: string,
    metadata?: any,
  ): Promise<number> {
    // Toxicity detection (inverted - higher score means less toxic)
    const toxicKeywords = [
      'hate',
      'violence',
      'harmful',
      'offensive',
      'toxic',
      'discriminatory',
    ];

    const outputWords = output.toLowerCase().split(/\W+/);
    const toxicCount = outputWords.filter((word) =>
      toxicKeywords.includes(word),
    ).length;

    // Score is inverted (1.0 = no toxicity, 0.0 = highly toxic)
    const toxicityScore = Math.max(
      0,
      1 - (toxicCount / outputWords.length) * 10,
    );

    return toxicityScore;
  }

  private async evaluateBias(
    input: string,
    output: string,
    groundTruth?: string,
    metadata?: any,
  ): Promise<number> {
    // Bias detection across demographics (simplified approach)
    const biasIndicators = ['gender', 'race', 'age', 'religion', 'nationality'];
    const stereotypeWords = [
      'always',
      'never',
      'all',
      'none',
      'typical',
      'usually',
    ];

    const outputLower = output.toLowerCase();
    let biasScore = 1.0;

    // Check for stereotype language with demographic terms
    biasIndicators.forEach((indicator) => {
      if (outputLower.includes(indicator)) {
        stereotypeWords.forEach((stereotype) => {
          if (outputLower.includes(stereotype)) {
            biasScore -= 0.1;
          }
        });
      }
    });

    return Math.max(0, biasScore);
  }

  private async evaluateHallucination(
    input: string,
    output: string,
    groundTruth?: string,
    metadata?: any,
  ): Promise<number> {
    // Factual accuracy assessment (simplified - in production use fact-checking APIs)

    // Check for unsupported claims
    const claimIndicators = [
      'studies show',
      'research proves',
      'scientists say',
      'data indicates',
    ];
    const outputLower = output.toLowerCase();

    let hallucinationScore = 0.9; // Base score assuming mostly factual

    claimIndicators.forEach((indicator) => {
      if (outputLower.includes(indicator)) {
        // In production, verify these claims against knowledge base
        hallucinationScore -= 0.1; // Penalty for unverified claims
      }
    });

    // Check for specific numbers/dates without context
    const numberPattern = /\b\d{4}\b|\b\d+%\b|\b\$\d+/g;
    const numbers = output.match(numberPattern) || [];
    if (numbers.length > 2) {
      hallucinationScore -= 0.05 * numbers.length; // Small penalty for many specific numbers
    }

    return Math.max(0, hallucinationScore);
  }

  private async evaluateLatency(
    input: string,
    output: string,
    groundTruth?: string,
    metadata?: any,
  ): Promise<number> {
    const latencyMs = metadata?.latencyMs || 1000; // Default 1s if not provided
    const targetLatency = metadata?.targetLatencyMs || 2000; // Default 2s target

    if (latencyMs <= targetLatency) return 1.0;

    // Exponential decay for latency penalty
    const latencyRatio = latencyMs / targetLatency;
    return Math.max(0, 1 / Math.pow(latencyRatio, 2));
  }

  private async evaluateCost(
    input: string,
    output: string,
    groundTruth?: string,
    metadata?: any,
  ): Promise<number> {
    const costUSD = metadata?.costUSD || 0.001; // Default cost
    const targetCost = metadata?.targetCostUSD || 0.01; // Default target

    if (costUSD <= targetCost) return 1.0;

    // Linear decay for cost penalty
    const costRatio = costUSD / targetCost;
    return Math.max(0, 1 - (costRatio - 1));
  }

  // Helper methods
  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity
    const set1 = new Set(str1.split(' '));
    const set2 = new Set(str2.split(' '));

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction (in production, use NLP libraries)
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3)
      .slice(0, 20); // Top 20 words
  }

  private calculateKeywordOverlap(
    keywords1: string[],
    keywords2: string[],
  ): number {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    return intersection.size / Math.max(set1.size, set2.size);
  }

  private calculateLengthPenalty(
    outputLength: number,
    inputLength: number,
  ): number {
    const expectedLength = inputLength * 2; // Rough heuristic
    const lengthRatio = outputLength / expectedLength;

    if (lengthRatio > 0.5 && lengthRatio < 2.0) return 0; // Good length
    if (lengthRatio <= 0.5) return 0.2; // Too short
    return Math.min(0.3, (lengthRatio - 2.0) * 0.1); // Too long
  }

  private detectSimpleContradictions(sentences: string[]): number {
    // Simple contradiction detection
    let contradictions = 0;

    for (let i = 0; i < sentences.length - 1; i++) {
      const sent1 = sentences[i].toLowerCase();
      for (let j = i + 1; j < sentences.length; j++) {
        const sent2 = sentences[j].toLowerCase();

        // Check for negation patterns
        if (
          (sent1.includes('not') && !sent2.includes('not')) ||
          (!sent1.includes('not') && sent2.includes('not'))
        ) {
          const words1 = new Set(sent1.split(' '));
          const words2 = new Set(sent2.split(' '));
          const overlap = new Set([...words1].filter((x) => words2.has(x)));

          if (overlap.size > 2) contradictions++;
        }
      }
    }

    return contradictions * 0.1; // Penalty per contradiction
  }

  private evaluateLogicalFlow(sentences: string[]): number {
    // Simple logical flow assessment
    let flowScore = 0.8;

    for (let i = 0; i < sentences.length - 1; i++) {
      const sent1 = sentences[i].toLowerCase();
      const sent2 = sentences[i + 1].toLowerCase();

      // Check for transition words
      const transitions = [
        'however',
        'therefore',
        'furthermore',
        'additionally',
        'consequently',
      ];
      const hasTransition = transitions.some((t) => sent2.includes(t));

      if (hasTransition) flowScore += 0.05;

      // Check for topic continuity
      const words1 = new Set(sent1.split(' '));
      const words2 = new Set(sent2.split(' '));
      const continuity = new Set([...words1].filter((x) => words2.has(x))).size;

      if (continuity === 0) flowScore -= 0.1; // No word overlap might indicate topic jump
    }

    return Math.max(0, Math.min(1, flowScore));
  }

  private async getActiveSLOs(tenantId: string): Promise<SemanticSLO[]> {
    const pool = getPostgresPool();
    const result = await pool.query(
      'SELECT * FROM semantic_slos WHERE tenant_id = $1',
      [tenantId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      metricType: row.metric_type,
      threshold: row.threshold,
      operator: row.operator,
      timeWindow: row.time_window,
      evaluationMethod: row.evaluation_method,
      criticality: row.criticality,
    }));
  }

  private checkSLOViolations(
    metrics: Record<string, number>,
    slos: SemanticSLO[],
  ): string[] {
    const violations: string[] = [];

    slos.forEach((slo) => {
      const metricValue = metrics[slo.metricType];
      if (metricValue === undefined) return;

      let violated = false;
      switch (slo.operator) {
        case 'gt':
          violated = metricValue <= slo.threshold;
          break;
        case 'gte':
          violated = metricValue < slo.threshold;
          break;
        case 'lt':
          violated = metricValue >= slo.threshold;
          break;
        case 'lte':
          violated = metricValue > slo.threshold;
          break;
        case 'eq':
          violated = Math.abs(metricValue - slo.threshold) > 0.05;
          break;
      }

      if (violated) {
        violations.push(slo.id);
      }
    });

    return violations;
  }

  private async createSLOAlerts(
    tenantId: string,
    modelId: string,
    violations: string[],
  ): Promise<void> {
    const pool = getPostgresPool();

    for (const violationSloId of violations) {
      await pool.query(
        `INSERT INTO slo_alerts (
          tenant_id, model_id, slo_id, alert_level, created_at
        ) VALUES ($1, $2, $3, $4, now())`,
        [tenantId, modelId, violationSloId, 'warning'],
      );
    }
  }

  private calculateAverageScores(
    batchMetrics: Record<string, number[]>,
  ): Record<string, number> {
    const averages: Record<string, number> = {};

    Object.entries(batchMetrics).forEach(([metric, values]) => {
      averages[metric] =
        values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    return averages;
  }

  private calculateSLOComplianceRate(results: EvaluationResult[]): number {
    if (results.length === 0) return 1.0;

    const compliantResults = results.filter(
      (r) => r.sloViolations.length === 0,
    );
    return compliantResults.length / results.length;
  }

  private async detectRegression(
    tenantId: string,
    modelId: string,
    currentMetrics: Record<string, number[]>,
  ): Promise<boolean> {
    // Compare with historical data (simplified)
    const pool = getPostgresPool();

    const historicalResult = await pool.query(
      `SELECT metrics FROM batch_evaluations 
       WHERE tenant_id = $1 AND model_id = $2 
       AND created_at > now() - interval '7 days'
       AND created_at < now() - interval '1 day'
       ORDER BY created_at DESC LIMIT 5`,
      [tenantId, modelId],
    );

    if (historicalResult.rows.length === 0) return false;

    // Simple regression detection - check if current scores are significantly lower
    const currentAverages = this.calculateAverageScores(currentMetrics);
    const historicalAverages = this.calculateHistoricalAverages(
      historicalResult.rows,
    );

    let significantDeclines = 0;
    Object.entries(currentAverages).forEach(([metric, currentValue]) => {
      const historicalValue = historicalAverages[metric];
      if (historicalValue && currentValue < historicalValue * 0.9) {
        significantDeclines++;
      }
    });

    return significantDeclines >= 2; // Regression if 2+ metrics declined significantly
  }

  private calculateDistributionStats(
    batchMetrics: Record<string, number[]>,
  ): any {
    const stats: any = {};

    Object.entries(batchMetrics).forEach(([metric, values]) => {
      values.sort((a, b) => a - b);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const median = values[Math.floor(values.length / 2)];
      const p90 = values[Math.floor(values.length * 0.9)];
      const p99 = values[Math.floor(values.length * 0.99)];

      stats[metric] = {
        mean,
        median,
        p90,
        p99,
        min: values[0],
        max: values[values.length - 1],
      };
    });

    return stats;
  }

  private aggregateMetrics(evaluations: any[]): Record<string, any> {
    const aggregated: Record<string, any> = {};
    const metricsByType: Record<string, number[]> = {};

    evaluations.forEach((evaluation) => {
      const metrics = JSON.parse(evaluation.metrics);
      Object.entries(metrics).forEach(([metric, value]) => {
        if (!metricsByType[metric]) metricsByType[metric] = [];
        metricsByType[metric].push(value as number);
      });
    });

    Object.entries(metricsByType).forEach(([metric, values]) => {
      values.sort((a, b) => a - b);
      aggregated[metric] = {
        mean: values.reduce((sum, val) => sum + val, 0) / values.length,
        median: values[Math.floor(values.length / 2)],
        p90: values[Math.floor(values.length * 0.9)],
        min: values[0],
        max: values[values.length - 1],
        count: values.length,
      };
    });

    return aggregated;
  }

  private calculateSLOCompliance(evaluations: any[]): number {
    if (evaluations.length === 0) return 1.0;

    const compliantCount = evaluations.filter((evaluation) => {
      const violations = JSON.parse(evaluation.slo_violations);
      return violations.length === 0;
    }).length;

    return compliantCount / evaluations.length;
  }

  private calculateOverallScore(
    aggregatedMetrics: Record<string, any>,
  ): number {
    // Weighted average of key metrics
    const weights = {
      accuracy: 0.3,
      relevance: 0.25,
      coherence: 0.2,
      toxicity: 0.15,
      bias: 0.1,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([metric, weight]) => {
      if (aggregatedMetrics[metric]) {
        weightedSum += aggregatedMetrics[metric].mean * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  private async generateRecommendations(
    tenantId: string,
    modelId: string,
    metrics: Record<string, any>,
    sloCompliance: number,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Accuracy recommendations
    if (metrics.accuracy && metrics.accuracy.mean < 0.7) {
      recommendations.push(
        'Consider fine-tuning the model with domain-specific data to improve accuracy',
      );
    }

    // Relevance recommendations
    if (metrics.relevance && metrics.relevance.mean < 0.6) {
      recommendations.push(
        'Review prompt engineering to improve response relevance',
      );
    }

    // Coherence recommendations
    if (metrics.coherence && metrics.coherence.mean < 0.7) {
      recommendations.push(
        'Consider using a model with better reasoning capabilities',
      );
    }

    // Toxicity recommendations
    if (metrics.toxicity && metrics.toxicity.mean < 0.9) {
      recommendations.push(
        'Implement content filtering to reduce harmful outputs',
      );
    }

    // Bias recommendations
    if (metrics.bias && metrics.bias.mean < 0.8) {
      recommendations.push(
        'Review training data for bias and consider bias mitigation techniques',
      );
    }

    // SLO compliance recommendations
    if (sloCompliance < 0.9) {
      recommendations.push(
        'Review and adjust SLO thresholds or improve model performance',
      );
    }

    // Latency recommendations
    if (metrics.latency && metrics.latency.mean < 0.8) {
      recommendations.push(
        'Consider model optimization or infrastructure scaling to improve response times',
      );
    }

    // Default recommendation
    if (recommendations.length === 0) {
      recommendations.push('Model performance is within acceptable ranges');
      recommendations.push(
        'Continue monitoring for any performance degradation',
      );
    }

    return recommendations;
  }

  private async detectRecentRegression(
    tenantId: string,
    modelId: string,
  ): Promise<boolean> {
    const pool = getPostgresPool();

    const recentResults = await pool.query(
      `SELECT overall_score FROM quality_reports 
       WHERE tenant_id = $1 AND model_id = $2 
       ORDER BY created_at DESC LIMIT 5`,
      [tenantId, modelId],
    );

    if (recentResults.rows.length < 3) return false;

    const scores = recentResults.rows.map((row) => row.overall_score);
    const trend = this.calculateTrend(scores);

    return trend < -0.05; // Significant downward trend
  }

  private async calculateSLOHealth(tenantId: string): Promise<any> {
    const pool = getPostgresPool();

    // Get SLO violation rates for the last 24 hours
    const violationsResult = await pool.query(
      `SELECT COUNT(*) as total_evaluations,
              SUM(CASE WHEN JSON_ARRAY_LENGTH(slo_violations) > 0 THEN 1 ELSE 0 END) as violations
       FROM evaluation_results 
       WHERE tenant_id = $1 AND created_at > now() - interval '24 hours'`,
      [tenantId],
    );

    const { total_evaluations, violations } = violationsResult.rows[0];
    const violationRate =
      total_evaluations > 0 ? violations / total_evaluations : 0;

    let overallHealth = 'healthy';
    if (violationRate > 0.1) overallHealth = 'degraded';
    if (violationRate > 0.3) overallHealth = 'critical';

    return {
      overallHealth,
      violationRate,
      totalEvaluations: parseInt(total_evaluations),
      violations: parseInt(violations),
    };
  }

  private calculateHistoricalAverages(
    historicalData: any[],
  ): Record<string, number> {
    const allMetrics: Record<string, number[]> = {};

    historicalData.forEach((data) => {
      const summary = JSON.parse(data.metrics);
      if (summary.averageScores) {
        Object.entries(summary.averageScores).forEach(([metric, value]) => {
          if (!allMetrics[metric]) allMetrics[metric] = [];
          allMetrics[metric].push(value as number);
        });
      }
    });

    const averages: Record<string, number> = {};
    Object.entries(allMetrics).forEach(([metric, values]) => {
      averages[metric] =
        values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    return averages;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    // Simple linear trend calculation
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + idx * val, 0);
    const sumX2 = values.reduce((sum, _, idx) => sum + idx * idx, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }
}

// Database schema
export const QUALITY_EVALUATION_SCHEMA = `
CREATE TABLE IF NOT EXISTS semantic_slos (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  threshold DECIMAL(5,4) NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('gt', 'lt', 'eq', 'gte', 'lte')),
  time_window INTEGER NOT NULL,
  evaluation_method TEXT NOT NULL CHECK (evaluation_method IN ('automated', 'human', 'hybrid')),
  criticality TEXT NOT NULL CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evaluation_results (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  input_text TEXT NOT NULL,
  output_text TEXT NOT NULL,
  ground_truth TEXT,
  metrics JSONB NOT NULL,
  slo_violations JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batch_evaluations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  dataset_size INTEGER NOT NULL,
  summary JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quality_reports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  time_range_start TIMESTAMP NOT NULL,
  time_range_end TIMESTAMP NOT NULL,
  overall_score DECIMAL(5,4) NOT NULL,
  slo_compliance DECIMAL(5,4) NOT NULL,
  metrics JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  regression_detected BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS slo_alerts (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  slo_id TEXT NOT NULL,
  alert_level TEXT NOT NULL CHECK (alert_level IN ('info', 'warning', 'error', 'critical')),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quality_audit (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_semantic_slos_tenant ON semantic_slos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_tenant_model ON evaluation_results(tenant_id, model_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_created_at ON evaluation_results(created_at);
CREATE INDEX IF NOT EXISTS idx_batch_evaluations_tenant_model ON batch_evaluations(tenant_id, model_id);
CREATE INDEX IF NOT EXISTS idx_quality_reports_tenant_model ON quality_reports(tenant_id, model_id);
CREATE INDEX IF NOT EXISTS idx_slo_alerts_tenant ON slo_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quality_audit_tenant ON quality_audit(tenant_id);
`;
