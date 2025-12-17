/**
 * LLM Chain Executor
 * Orchestrates LLM-powered threat hunting with hypothesis generation,
 * query generation, and result analysis
 */

import { EventEmitter } from 'events';
import logger from '../config/logger.js';
import type {
  LLMChainConfig,
  LLMChainResult,
  LLMChainType,
  ThreatHypothesis,
  GeneratedCypherQuery,
  HuntFinding,
  HuntContext,
  MitreAttackTechnique,
  ThreatSeverity,
  ThreatClassification,
  QueryExecutionResult,
} from './types.js';

interface LLMProvider {
  complete(params: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<{
    content: string;
    tokensUsed: { prompt: number; completion: number; total: number };
    latencyMs: number;
  }>;
}

interface HypothesisGenerationOutput {
  hypotheses: ThreatHypothesis[];
  priorityOrder: string[];
}

interface QueryGenerationOutput {
  queries: GeneratedCypherQuery[];
  metadata: {
    templatesCached: number;
    queriesGenerated: number;
    validationsPassed: number;
  };
}

interface ResultAnalysisOutput {
  findings: HuntFinding[];
  precisionEstimate: number;
  falsePositiveIndicators: string[];
}

const DEFAULT_SYSTEM_PROMPTS: Record<LLMChainType, string> = {
  hypothesis_generation: `You are an expert threat hunter with deep knowledge of MITRE ATT&CK, cyber kill chains, and adversary tradecraft. Your role is to generate specific, testable threat hunting hypotheses based on the provided threat intelligence context.

For each hypothesis, you must provide:
1. A clear, specific hypothesis statement that can be validated against graph data
2. Relevant MITRE ATT&CK technique IDs and names
3. The name of the Cypher query template to use
4. Expected indicators that would confirm or refute the hypothesis
5. A confidence level (0-1) based on the strength of the intelligence

Focus on high-precision hypotheses that minimize false positives while catching real threats.`,

  cypher_generation: `You are an expert Neo4j Cypher query developer specializing in threat hunting queries. Your role is to generate optimized, safe, parameterized Cypher queries that efficiently search the knowledge graph for threat indicators.

Rules:
1. All queries MUST be read-only (no CREATE, DELETE, SET, REMOVE, MERGE)
2. All queries MUST include a LIMIT clause
3. Use parameterization for all variable values
4. Optimize for performance using indexes where available
5. Include appropriate WHERE clauses to filter results
6. Return structured data that can be easily analyzed

Target precision: 91% or higher.`,

  result_analysis: `You are an expert threat analyst responsible for analyzing threat hunting query results. Your role is to classify findings by severity, assess confidence levels, and recommend appropriate response actions.

For each finding, assess:
1. Severity (CRITICAL, HIGH, MEDIUM, LOW, INFO)
2. Confidence level (0-1) based on evidence strength
3. Threat classification (malware, APT, insider threat, etc.)
4. Entities and IOCs involved
5. MITRE ATT&CK techniques observed
6. Recommended actions (automated and manual)
7. Whether auto-remediation is appropriate

Prioritize precision over recall - it's better to miss a threat than to trigger false positives.`,

  remediation_planning: `You are a security operations expert planning remediation actions for confirmed threats. Your role is to recommend safe, effective remediation actions that minimize business disruption while neutralizing threats.

Consider:
1. Business impact of each action
2. Reversibility and rollback procedures
3. Dependencies between actions
4. Required approvals for high-impact actions
5. Verification steps to confirm success`,

  report_generation: `You are a security analyst generating executive-level threat hunting reports. Create clear, actionable summaries that communicate findings to both technical and non-technical stakeholders.

Include:
1. Executive summary with key findings
2. Detailed technical analysis
3. IOCs discovered with confidence levels
4. Recommended next steps
5. Metrics on hunt effectiveness`,
};

export class LLMChainExecutor extends EventEmitter {
  private provider: LLMProvider | null = null;
  private chainHistory: Map<string, LLMChainResult<unknown>[]> = new Map();
  private metricsCollector: MetricsCollector;

  constructor() {
    super();
    this.metricsCollector = new MetricsCollector();
  }

  /**
   * Initialize with an LLM provider
   */
  initialize(provider: LLMProvider): void {
    this.provider = provider;
    logger.info('LLM Chain Executor initialized');
  }

  /**
   * Execute hypothesis generation chain
   */
  async generateHypotheses(
    context: HuntContext,
    config?: Partial<LLMChainConfig>
  ): Promise<LLMChainResult<HypothesisGenerationOutput>> {
    const chainConfig = this.buildChainConfig('hypothesis_generation', config);

    const userPrompt = this.buildHypothesisPrompt(context);

    const result = await this.executeChain<HypothesisGenerationOutput>(
      chainConfig,
      userPrompt
    );

    // Validate and enrich hypotheses
    if (result.success && result.output) {
      result.output.hypotheses = result.output.hypotheses.map((h, i) => ({
        ...h,
        id: h.id || `hypothesis-${Date.now()}-${i}`,
        priority: h.priority || i + 1,
      }));
    }

    this.emit('hypotheses_generated', {
      huntId: context.huntId,
      count: result.output?.hypotheses.length || 0,
    });

    return result;
  }

  /**
   * Execute Cypher query generation chain
   */
  async generateQueries(
    hypotheses: ThreatHypothesis[],
    context: HuntContext,
    config?: Partial<LLMChainConfig>
  ): Promise<LLMChainResult<QueryGenerationOutput>> {
    const chainConfig = this.buildChainConfig('cypher_generation', config);

    const userPrompt = this.buildQueryGenerationPrompt(hypotheses, context);

    const result = await this.executeChain<QueryGenerationOutput>(
      chainConfig,
      userPrompt
    );

    // Validate queries
    if (result.success && result.output) {
      const validationResults = result.output.queries.map((q) =>
        this.validateGeneratedQuery(q)
      );
      result.output.metadata = {
        templatesCached: 0,
        queriesGenerated: result.output.queries.length,
        validationsPassed: validationResults.filter((v) => v).length,
      };
    }

    this.emit('queries_generated', {
      huntId: context.huntId,
      count: result.output?.queries.length || 0,
    });

    return result;
  }

  /**
   * Execute result analysis chain
   */
  async analyzeResults(
    results: QueryExecutionResult[],
    hypotheses: ThreatHypothesis[],
    context: HuntContext,
    config?: Partial<LLMChainConfig>
  ): Promise<LLMChainResult<ResultAnalysisOutput>> {
    const chainConfig = this.buildChainConfig('result_analysis', config);

    const userPrompt = this.buildResultAnalysisPrompt(results, hypotheses, context);

    const result = await this.executeChain<ResultAnalysisOutput>(
      chainConfig,
      userPrompt
    );

    // Post-process findings
    if (result.success && result.output) {
      result.output.findings = result.output.findings.map((f, i) => ({
        ...f,
        id: f.id || `finding-${Date.now()}-${i}`,
        timestamp: new Date(),
      }));

      // Calculate precision estimate if not provided
      if (!result.output.precisionEstimate) {
        result.output.precisionEstimate = this.estimatePrecision(
          result.output.findings
        );
      }
    }

    this.emit('results_analyzed', {
      huntId: context.huntId,
      findingsCount: result.output?.findings.length || 0,
      precision: result.output?.precisionEstimate || 0,
    });

    return result;
  }

  /**
   * Build chain configuration with defaults
   */
  private buildChainConfig(
    chainType: LLMChainType,
    overrides?: Partial<LLMChainConfig>
  ): LLMChainConfig {
    return {
      model: overrides?.model || 'claude-3-opus',
      temperature: overrides?.temperature ?? 0.1,
      maxTokens: overrides?.maxTokens || 4096,
      chainType,
      systemPrompt:
        overrides?.systemPrompt || DEFAULT_SYSTEM_PROMPTS[chainType],
      userPromptTemplate: overrides?.userPromptTemplate || '',
      outputParser: overrides?.outputParser || 'json',
      context: overrides?.context,
      validation: overrides?.validation,
    };
  }

  /**
   * Execute an LLM chain
   */
  private async executeChain<T>(
    config: LLMChainConfig,
    userPrompt: string
  ): Promise<LLMChainResult<T>> {
    if (!this.provider) {
      return {
        success: false,
        output: null as unknown as T,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        latencyMs: 0,
        model: config.model,
        validationPassed: false,
        validationErrors: ['LLM provider not initialized'],
      };
    }

    const startTime = Date.now();

    try {
      const response = await this.provider.complete({
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        systemPrompt: config.systemPrompt,
        userPrompt,
      });

      const parsed = this.parseOutput<T>(response.content, config.outputParser);

      const validationResult = this.validateOutput(parsed, config.validation);

      const result: LLMChainResult<T> = {
        success: true,
        output: parsed,
        tokensUsed: response.tokensUsed,
        latencyMs: Date.now() - startTime,
        model: config.model,
        validationPassed: validationResult.passed,
        validationErrors: validationResult.errors,
      };

      // Track chain execution
      this.trackExecution(config.chainType, result);

      return result;
    } catch (error) {
      logger.error('LLM chain execution failed', {
        chainType: config.chainType,
        error: (error as Error).message,
      });

      return {
        success: false,
        output: null as unknown as T,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        latencyMs: Date.now() - startTime,
        model: config.model,
        validationPassed: false,
        validationErrors: [(error as Error).message],
      };
    }
  }

  /**
   * Parse LLM output based on parser type
   */
  private parseOutput<T>(content: string, parser: string): T {
    switch (parser) {
      case 'json':
      case 'json_hypotheses':
      case 'json_queries':
      case 'json_findings':
        return this.parseJSON<T>(content);
      case 'structured':
        return this.parseStructured<T>(content);
      default:
        return content as unknown as T;
    }
  }

  /**
   * Parse JSON from LLM output (handles markdown code blocks)
   */
  private parseJSON<T>(content: string): T {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();

    try {
      return JSON.parse(jsonStr);
    } catch {
      // Try to fix common JSON issues
      const fixed = jsonStr
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/'/g, '"');
      return JSON.parse(fixed);
    }
  }

  /**
   * Parse structured output
   */
  private parseStructured<T>(content: string): T {
    // Implement structured parsing logic
    return this.parseJSON<T>(content);
  }

  /**
   * Validate output against schema/rules
   */
  private validateOutput(
    output: unknown,
    validation?: LLMChainConfig['validation']
  ): { passed: boolean; errors: string[] } {
    if (!validation) {
      return { passed: true, errors: [] };
    }

    const errors: string[] = [];

    // Check required fields
    if (validation.requiredFields && typeof output === 'object' && output !== null) {
      for (const field of validation.requiredFields) {
        if (!(field in output)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    return { passed: errors.length === 0, errors };
  }

  /**
   * Build hypothesis generation prompt
   */
  private buildHypothesisPrompt(context: HuntContext): string {
    return `Generate threat hunting hypotheses based on the following context:

## Hunt Scope
${context.scope}

## Time Window
Last ${context.timeWindowHours} hours

## Active Threats
${JSON.stringify(context.activeThreats.slice(0, 10), null, 2)}

## Recent Alerts
${JSON.stringify(context.recentAlerts.slice(0, 10), null, 2)}

## Baseline Anomalies
${JSON.stringify(context.baselineAnomalies.slice(0, 10), null, 2)}

## Available Graph Schema
Node Labels: ${context.graphSchema.nodeLabels.join(', ')}
Relationship Types: ${context.graphSchema.relationshipTypes.join(', ')}

Generate 5 prioritized threat hunting hypotheses. Return as JSON:
{
  "hypotheses": [
    {
      "id": "hypothesis-1",
      "statement": "...",
      "mitreAttackTechniques": [{"id": "T1234", "name": "...", "tactic": "..."}],
      "requiredQueryTemplate": "template_name",
      "expectedIndicators": ["..."],
      "confidenceLevel": 0.8,
      "priority": 1,
      "rationale": "...",
      "dataRequirements": ["..."]
    }
  ],
  "priorityOrder": ["hypothesis-1", "hypothesis-2", ...]
}`;
  }

  /**
   * Build query generation prompt
   */
  private buildQueryGenerationPrompt(
    hypotheses: ThreatHypothesis[],
    context: HuntContext
  ): string {
    return `Generate optimized Cypher queries for the following hypotheses:

## Hypotheses
${JSON.stringify(hypotheses, null, 2)}

## Graph Schema
Node Labels: ${context.graphSchema.nodeLabels.join(', ')}
Relationship Types: ${context.graphSchema.relationshipTypes.join(', ')}
Indexes: ${JSON.stringify(context.graphSchema.indexes)}

## Configuration
- Max results per query: ${context.configuration.maxResultsPerQuery}
- Time window: ${context.timeWindowHours} hours
- Precision mode: ${context.configuration.precisionMode}

Generate parameterized Cypher queries. Return as JSON:
{
  "queries": [
    {
      "id": "query-1",
      "hypothesisId": "hypothesis-1",
      "query": "MATCH (n:Entity)...",
      "params": {"param1": "value1"},
      "templateUsed": "template_name",
      "estimatedComplexity": 50,
      "estimatedResultSize": 100
    }
  ],
  "metadata": {
    "templatesCached": 0,
    "queriesGenerated": 5,
    "validationsPassed": 5
  }
}`;
  }

  /**
   * Build result analysis prompt
   */
  private buildResultAnalysisPrompt(
    results: QueryExecutionResult[],
    hypotheses: ThreatHypothesis[],
    context: HuntContext
  ): string {
    // Summarize results to avoid token overflow
    const summarizedResults = results.map((r) => ({
      queryId: r.queryId,
      hypothesisId: r.hypothesisId,
      success: r.success,
      recordCount: r.recordCount,
      executionTimeMs: r.executionTimeMs,
      sampleRecords: r.records.slice(0, 5),
    }));

    return `Analyze threat hunting results and identify findings:

## Query Results
${JSON.stringify(summarizedResults, null, 2)}

## Original Hypotheses
${JSON.stringify(hypotheses, null, 2)}

## Analysis Parameters
- Confidence threshold: ${context.configuration.confidenceThreshold}
- Target precision: ${context.configuration.targetPrecision}
- Auto-remediation enabled: ${context.configuration.autoRemediate}

Analyze results and generate findings. Focus on HIGH PRECISION (91% target).
Return as JSON:
{
  "findings": [
    {
      "id": "finding-1",
      "hypothesisId": "hypothesis-1",
      "severity": "HIGH",
      "confidence": 0.85,
      "classification": "LATERAL_MOVEMENT",
      "entitiesInvolved": [{"id": "...", "type": "...", "name": "..."}],
      "iocsIdentified": [{"id": "...", "type": "IP_ADDRESS", "value": "..."}],
      "ttpsMatched": [{"id": "T1021", "name": "Remote Services", "tactic": "Lateral Movement"}],
      "recommendedActions": [{"id": "...", "type": "BLOCK_IP", "description": "..."}],
      "autoRemediationEligible": true,
      "evidenceSummary": "..."
    }
  ],
  "precisionEstimate": 0.91,
  "falsePositiveIndicators": ["..."]
}`;
  }

  /**
   * Validate a generated query
   */
  private validateGeneratedQuery(query: GeneratedCypherQuery): boolean {
    // Check for forbidden clauses
    const forbidden = ['DELETE', 'DETACH DELETE', 'REMOVE', 'SET', 'CREATE', 'MERGE'];
    const upperQuery = query.query.toUpperCase();

    for (const clause of forbidden) {
      if (upperQuery.includes(clause)) {
        return false;
      }
    }

    // Check for LIMIT
    if (!/\bLIMIT\s+\d+/i.test(query.query)) {
      return false;
    }

    return true;
  }

  /**
   * Estimate precision based on finding characteristics
   */
  private estimatePrecision(findings: HuntFinding[]): number {
    if (findings.length === 0) return 1.0;

    let totalConfidence = 0;
    let count = 0;

    for (const finding of findings) {
      // Weight by severity
      const severityWeight =
        finding.severity === 'CRITICAL'
          ? 1.0
          : finding.severity === 'HIGH'
            ? 0.9
            : finding.severity === 'MEDIUM'
              ? 0.8
              : 0.7;

      totalConfidence += finding.confidence * severityWeight;
      count++;
    }

    return count > 0 ? totalConfidence / count : 0;
  }

  /**
   * Track chain execution for analytics
   */
  private trackExecution(chainType: LLMChainType, result: LLMChainResult<unknown>): void {
    const history = this.chainHistory.get(chainType) || [];
    history.push(result);

    // Keep only last 100 executions
    if (history.length > 100) {
      history.shift();
    }

    this.chainHistory.set(chainType, history);

    // Update metrics
    this.metricsCollector.recordExecution({
      chainType,
      success: result.success,
      tokensUsed: result.tokensUsed.total,
      latencyMs: result.latencyMs,
    });
  }

  /**
   * Get chain execution statistics
   */
  getExecutionStats(chainType?: LLMChainType): ExecutionStats {
    const chains = chainType
      ? [{ type: chainType, history: this.chainHistory.get(chainType) || [] }]
      : Array.from(this.chainHistory.entries()).map(([type, history]) => ({
          type,
          history,
        }));

    let totalExecutions = 0;
    let successfulExecutions = 0;
    let totalTokens = 0;
    let totalLatency = 0;

    for (const { history } of chains) {
      for (const result of history) {
        totalExecutions++;
        if (result.success) successfulExecutions++;
        totalTokens += result.tokensUsed.total;
        totalLatency += result.latencyMs;
      }
    }

    return {
      totalExecutions,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
      avgTokensPerExecution: totalExecutions > 0 ? totalTokens / totalExecutions : 0,
      avgLatencyMs: totalExecutions > 0 ? totalLatency / totalExecutions : 0,
      totalTokensUsed: totalTokens,
    };
  }
}

interface ExecutionStats {
  totalExecutions: number;
  successRate: number;
  avgTokensPerExecution: number;
  avgLatencyMs: number;
  totalTokensUsed: number;
}

class MetricsCollector {
  private executions: Array<{
    chainType: LLMChainType;
    success: boolean;
    tokensUsed: number;
    latencyMs: number;
    timestamp: Date;
  }> = [];

  recordExecution(data: {
    chainType: LLMChainType;
    success: boolean;
    tokensUsed: number;
    latencyMs: number;
  }): void {
    this.executions.push({
      ...data,
      timestamp: new Date(),
    });

    // Keep only last 1000 executions
    if (this.executions.length > 1000) {
      this.executions.shift();
    }
  }

  getMetrics(): Record<string, unknown> {
    return {
      totalExecutions: this.executions.length,
      byChainType: this.groupByChainType(),
    };
  }

  private groupByChainType(): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const exec of this.executions) {
      groups[exec.chainType] = (groups[exec.chainType] || 0) + 1;
    }
    return groups;
  }
}

export const llmChainExecutor = new LLMChainExecutor();
