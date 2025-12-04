/**
 * Threat Hunting Orchestrator
 * Main orchestration layer for agentic threat hunting over the knowledge graph
 * Coordinates LLM chaining, query execution, and auto-remediation
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import logger from '../config/logger.js';
import { runCypher } from '../graph/neo4j.js';
import { cypherTemplateEngine, CypherTemplateEngine } from './CypherTemplateEngine.js';
import { llmChainExecutor, LLMChainExecutor } from './LLMChainExecutor.js';
import { autoRemediationHooks, AutoRemediationHooks } from './AutoRemediationHooks.js';
import type {
  HuntContext,
  HuntConfiguration,
  HuntStatus,
  HuntScope,
  ThreatHypothesis,
  GeneratedCypherQuery,
  QueryExecutionResult,
  HuntFinding,
  EnrichedFinding,
  HuntMetrics,
  HuntReport,
  StartHuntRequest,
  StartHuntResponse,
  HuntStatusResponse,
  HuntResultsResponse,
  RemediationPlan,
  GraphSchemaInfo,
  Alert,
  BaselineAnomaly,
  ActiveThreat,
  HuntEvent,
} from './types.js';

interface HuntExecution {
  context: HuntContext;
  hypotheses: ThreatHypothesis[];
  queries: GeneratedCypherQuery[];
  queryResults: QueryExecutionResult[];
  findings: HuntFinding[];
  enrichedFindings: EnrichedFinding[];
  remediationPlan?: RemediationPlan;
  report?: HuntReport;
  metrics: Partial<HuntMetrics>;
  startTime: number;
  endTime?: number;
}

const DEFAULT_CONFIGURATION: HuntConfiguration = {
  maxResultsPerQuery: 100,
  confidenceThreshold: 0.7,
  autoRemediate: false,
  remediationApprovalRequired: true,
  llmModel: 'claude-3-opus',
  llmTemperature: 0.1,
  precisionMode: true,
  targetPrecision: 0.91,
  ctiSources: ['misp', 'otx', 'virustotal', 'shodan', 'censys'],
  osintSources: ['pastebin', 'github', 'twitter', 'reddit'],
};

export class ThreatHuntingOrchestrator extends EventEmitter {
  private executions: Map<string, HuntExecution> = new Map();
  private templateEngine: CypherTemplateEngine;
  private llmExecutor: LLMChainExecutor;
  private remediationHooks: AutoRemediationHooks;
  private isInitialized: boolean = false;

  constructor() {
    super();
    this.templateEngine = cypherTemplateEngine;
    this.llmExecutor = llmChainExecutor;
    this.remediationHooks = autoRemediationHooks;

    // Forward events from sub-components
    this.setupEventForwarding();
  }

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.templateEngine.initialize();

      // Initialize LLM executor with a provider (in production, inject actual provider)
      this.llmExecutor.initialize({
        complete: async (params) => {
          // Mock LLM response for demonstration
          return this.mockLLMComplete(params);
        },
      });

      this.isInitialized = true;
      logger.info('Threat Hunting Orchestrator initialized', {
        templatesLoaded: this.templateEngine.getAllTemplates().length,
      });
    } catch (error) {
      logger.error('Failed to initialize orchestrator', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Start a new threat hunt
   */
  async startHunt(request: StartHuntRequest = {}): Promise<StartHuntResponse> {
    await this.ensureInitialized();

    const huntId = randomUUID();
    const startTime = Date.now();

    // Build configuration
    const configuration: HuntConfiguration = {
      ...DEFAULT_CONFIGURATION,
      ...request.configuration,
    };

    // Initialize hunt context
    const context = await this.buildHuntContext(
      huntId,
      request.scope || 'all',
      request.timeWindowHours || 24,
      configuration
    );

    // Create execution record
    const execution: HuntExecution = {
      context,
      hypotheses: [],
      queries: [],
      queryResults: [],
      findings: [],
      enrichedFindings: [],
      metrics: {},
      startTime,
    };

    this.executions.set(huntId, execution);
    this.emitEvent('hunt_started', { huntId, context });

    // Start async execution
    this.executeHunt(huntId, request.customHypotheses).catch((error) => {
      logger.error('Hunt execution failed', { huntId, error: error.message });
      execution.context.status = 'failed';
      this.emitEvent('hunt_failed', { huntId, error: error.message });
    });

    return {
      huntId,
      status: 'initializing',
      estimatedDuration: this.estimateHuntDuration(configuration),
      startedAt: new Date(),
    };
  }

  /**
   * Get hunt status
   */
  async getHuntStatus(huntId: string): Promise<HuntStatusResponse> {
    const execution = this.executions.get(huntId);
    if (!execution) {
      throw new Error(`Hunt ${huntId} not found`);
    }

    const elapsedMs = Date.now() - execution.startTime;
    const progress = this.calculateProgress(execution);

    return {
      huntId,
      status: execution.context.status,
      progress,
      currentPhase: this.getCurrentPhase(execution.context.status),
      findingsCount: execution.findings.length,
      elapsedTimeMs: elapsedMs,
      estimatedRemainingMs: this.estimateRemainingTime(execution, progress),
    };
  }

  /**
   * Get hunt results
   */
  async getHuntResults(huntId: string): Promise<HuntResultsResponse> {
    const execution = this.executions.get(huntId);
    if (!execution) {
      throw new Error(`Hunt ${huntId} not found`);
    }

    return {
      huntId,
      status: execution.context.status,
      findings: execution.enrichedFindings,
      metrics: this.calculateFinalMetrics(execution),
      report: execution.report,
      completedAt: execution.endTime ? new Date(execution.endTime) : undefined,
    };
  }

  /**
   * Cancel a running hunt
   */
  async cancelHunt(huntId: string): Promise<void> {
    const execution = this.executions.get(huntId);
    if (!execution) {
      throw new Error(`Hunt ${huntId} not found`);
    }

    if (
      execution.context.status === 'completed' ||
      execution.context.status === 'failed'
    ) {
      throw new Error(`Cannot cancel hunt in status: ${execution.context.status}`);
    }

    execution.context.status = 'cancelled';
    execution.endTime = Date.now();
    this.emitEvent('hunt_cancelled', { huntId });
  }

  /**
   * Execute the full hunt workflow
   */
  private async executeHunt(
    huntId: string,
    customHypotheses?: Partial<ThreatHypothesis>[]
  ): Promise<void> {
    const execution = this.executions.get(huntId)!;
    const context = execution.context;

    try {
      // Phase 1: Generate hypotheses
      context.status = 'generating_hypotheses';
      this.emitEvent('phase_started', { huntId, phase: 'generating_hypotheses' });

      if (customHypotheses && customHypotheses.length > 0) {
        execution.hypotheses = customHypotheses.map((h, i) => ({
          id: h.id || `hypothesis-${i}`,
          statement: h.statement || '',
          mitreAttackTechniques: h.mitreAttackTechniques || [],
          requiredQueryTemplate: h.requiredQueryTemplate || '',
          expectedIndicators: h.expectedIndicators || [],
          confidenceLevel: h.confidenceLevel || 0.7,
          priority: h.priority || i + 1,
          rationale: h.rationale || '',
          dataRequirements: h.dataRequirements || [],
        }));
      } else {
        const hypothesesResult = await this.llmExecutor.generateHypotheses(context);
        if (hypothesesResult.success) {
          execution.hypotheses = hypothesesResult.output.hypotheses;
          execution.metrics.totalHypothesesTested = execution.hypotheses.length;
          execution.metrics.llmTokensUsed =
            (execution.metrics.llmTokensUsed || 0) + hypothesesResult.tokensUsed.total;
        }
      }

      if (context.status === 'cancelled') return;

      // Phase 2: Generate Cypher queries
      context.status = 'executing_queries';
      this.emitEvent('phase_started', { huntId, phase: 'executing_queries' });

      const queriesResult = await this.llmExecutor.generateQueries(
        execution.hypotheses,
        context
      );

      if (queriesResult.success) {
        execution.queries = queriesResult.output.queries;
        execution.metrics.totalQueriesExecuted = execution.queries.length;
        execution.metrics.llmTokensUsed =
          (execution.metrics.llmTokensUsed || 0) + queriesResult.tokensUsed.total;
      }

      if (context.status === 'cancelled') return;

      // Phase 3: Execute queries in parallel
      execution.queryResults = await this.executeQueries(
        execution.queries,
        context.configuration.maxResultsPerQuery
      );

      if (context.status === 'cancelled') return;

      // Phase 4: Analyze results
      context.status = 'analyzing_results';
      this.emitEvent('phase_started', { huntId, phase: 'analyzing_results' });

      const analysisResult = await this.llmExecutor.analyzeResults(
        execution.queryResults,
        execution.hypotheses,
        context
      );

      if (analysisResult.success) {
        execution.findings = analysisResult.output.findings;
        execution.metrics.totalFindingsDiscovered = execution.findings.length;
        execution.metrics.precisionEstimate = analysisResult.output.precisionEstimate;
        execution.metrics.llmTokensUsed =
          (execution.metrics.llmTokensUsed || 0) + analysisResult.tokensUsed.total;
      }

      if (context.status === 'cancelled') return;

      // Phase 5: Enrich findings
      context.status = 'enriching_findings';
      this.emitEvent('phase_started', { huntId, phase: 'enriching_findings' });

      execution.enrichedFindings = await this.remediationHooks.enrichFindings(
        execution.findings
      );

      // Count IOCs
      execution.metrics.iocsDiscovered = execution.enrichedFindings.reduce(
        (sum, f) => sum + f.iocsIdentified.length,
        0
      );

      if (context.status === 'cancelled') return;

      // Phase 6: Auto-remediation (if enabled)
      if (context.configuration.autoRemediate) {
        context.status = 'remediating';
        this.emitEvent('phase_started', { huntId, phase: 'remediating' });

        execution.remediationPlan = await this.remediationHooks.createRemediationPlan(
          huntId,
          execution.enrichedFindings,
          context.configuration.remediationApprovalRequired
        );

        if (!context.configuration.remediationApprovalRequired) {
          const results = await this.remediationHooks.executePlan(
            execution.remediationPlan.id
          );

          execution.metrics.remediationActionsExecuted = results.length;
          execution.metrics.remediationSuccessRate =
            results.filter((r) => r.success).length / results.length;
        }
      }

      // Phase 7: Generate report
      execution.report = this.generateReport(execution);

      // Complete
      context.status = 'completed';
      execution.endTime = Date.now();
      execution.metrics.executionTimeMs = execution.endTime - execution.startTime;

      // Calculate final metrics
      const finalMetrics = this.calculateFinalMetrics(execution);
      execution.metrics = finalMetrics;

      this.emitEvent('hunt_completed', {
        huntId,
        metrics: finalMetrics,
        findingsCount: execution.enrichedFindings.length,
      });

      logger.info('Hunt completed successfully', {
        huntId,
        duration: execution.metrics.executionTimeMs,
        findings: execution.enrichedFindings.length,
        precision: execution.metrics.precisionEstimate,
      });
    } catch (error) {
      context.status = 'failed';
      execution.endTime = Date.now();
      throw error;
    }
  }

  /**
   * Execute queries against the graph
   */
  private async executeQueries(
    queries: GeneratedCypherQuery[],
    maxResults: number
  ): Promise<QueryExecutionResult[]> {
    const results: QueryExecutionResult[] = [];

    // Execute in parallel with concurrency limit
    const concurrencyLimit = 5;
    const batches: GeneratedCypherQuery[][] = [];

    for (let i = 0; i < queries.length; i += concurrencyLimit) {
      batches.push(queries.slice(i, i + concurrencyLimit));
    }

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(async (query) => {
          const startTime = Date.now();

          try {
            // Ensure query has limit
            const limitedQuery = this.templateEngine.ensureLimit(
              query.query,
              maxResults
            );

            const records = await runCypher(limitedQuery, query.params);

            return {
              queryId: query.id,
              hypothesisId: query.hypothesisId,
              success: true,
              records,
              recordCount: records.length,
              executionTimeMs: Date.now() - startTime,
              metadata: {
                plannerUsed: 'RULE',
                dbHits: 0,
                cacheHits: 0,
              },
            } as QueryExecutionResult;
          } catch (error) {
            return {
              queryId: query.id,
              hypothesisId: query.hypothesisId,
              success: false,
              records: [],
              recordCount: 0,
              executionTimeMs: Date.now() - startTime,
              error: (error as Error).message,
              metadata: {
                plannerUsed: 'UNKNOWN',
                dbHits: 0,
                cacheHits: 0,
              },
            } as QueryExecutionResult;
          }
        })
      );

      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Build hunt context with graph schema and baseline data
   */
  private async buildHuntContext(
    huntId: string,
    scope: HuntScope,
    timeWindowHours: number,
    configuration: HuntConfiguration
  ): Promise<HuntContext> {
    const graphSchema = await this.fetchGraphSchema();
    const recentAlerts = await this.fetchRecentAlerts(timeWindowHours);
    const baselineAnomalies = await this.detectBaselineAnomalies(timeWindowHours);
    const activeThreats = await this.fetchActiveThreats();

    return {
      huntId,
      scope,
      timeWindowHours,
      initiatedBy: 'system',
      initiatedAt: new Date(),
      status: 'initializing',
      graphSchema,
      recentAlerts,
      baselineAnomalies,
      activeThreats,
      configuration,
    };
  }

  /**
   * Fetch graph schema information
   */
  private async fetchGraphSchema(): Promise<GraphSchemaInfo> {
    try {
      // Query for labels
      const labelsResult = await runCypher('CALL db.labels() YIELD label RETURN label');
      const nodeLabels = labelsResult.map((r: any) => r.label);

      // Query for relationship types
      const relsResult = await runCypher(
        'CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType'
      );
      const relationshipTypes = relsResult.map((r: any) => r.relationshipType);

      return {
        nodeLabels,
        relationshipTypes,
        propertyKeys: {},
        indexes: [],
        constraints: [],
      };
    } catch {
      // Return defaults if graph is not available
      return {
        nodeLabels: ['Entity', 'User', 'Host', 'Process', 'File', 'Network'],
        relationshipTypes: [
          'CONNECTED_TO',
          'ACCESSED',
          'CREATED',
          'MODIFIED',
          'AUTHENTICATED',
        ],
        propertyKeys: {},
        indexes: [],
        constraints: [],
      };
    }
  }

  /**
   * Fetch recent alerts
   */
  private async fetchRecentAlerts(timeWindowHours: number): Promise<Alert[]> {
    // In production, query from alert database
    return [];
  }

  /**
   * Detect baseline anomalies
   */
  private async detectBaselineAnomalies(
    timeWindowHours: number
  ): Promise<BaselineAnomaly[]> {
    // In production, run anomaly detection queries
    return [];
  }

  /**
   * Fetch active threats
   */
  private async fetchActiveThreats(): Promise<ActiveThreat[]> {
    // In production, query from threat database
    return [];
  }

  /**
   * Generate hunt report
   */
  private generateReport(execution: HuntExecution): HuntReport {
    const metrics = this.calculateFinalMetrics(execution);

    return {
      id: `report-${execution.context.huntId}`,
      huntId: execution.context.huntId,
      title: `Threat Hunt Report - ${new Date().toISOString().split('T')[0]}`,
      executiveSummary: this.generateExecutiveSummary(execution),
      generatedAt: new Date(),
      generatedBy: 'Threat Hunting Orchestrator',
      sections: [
        {
          id: 'summary',
          title: 'Executive Summary',
          type: 'summary',
          content: this.generateExecutiveSummary(execution),
        },
        {
          id: 'findings',
          title: 'Detailed Findings',
          type: 'findings',
          content: execution.enrichedFindings,
        },
        {
          id: 'iocs',
          title: 'Indicators of Compromise',
          type: 'iocs',
          content: this.extractAllIOCs(execution.enrichedFindings),
        },
        {
          id: 'metrics',
          title: 'Hunt Metrics',
          type: 'metrics',
          content: metrics,
        },
      ],
      metrics,
      attachments: [],
      format: 'json',
    };
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(execution: HuntExecution): string {
    const findingsBySeverity = this.groupFindingsBySeverity(execution.enrichedFindings);
    const criticalCount = findingsBySeverity['CRITICAL'] || 0;
    const highCount = findingsBySeverity['HIGH'] || 0;

    return `Threat hunt completed with ${execution.enrichedFindings.length} findings discovered. ` +
      `${criticalCount} critical and ${highCount} high severity findings require immediate attention. ` +
      `${execution.metrics.iocsDiscovered || 0} IOCs were identified across all findings. ` +
      `Estimated precision: ${((execution.metrics.precisionEstimate || 0) * 100).toFixed(1)}%.`;
  }

  /**
   * Extract all IOCs from findings
   */
  private extractAllIOCs(findings: EnrichedFinding[]): any[] {
    const iocs: any[] = [];
    for (const finding of findings) {
      for (const ioc of finding.iocsIdentified) {
        iocs.push({
          ...ioc,
          findingId: finding.id,
          severity: finding.severity,
        });
      }
    }
    return iocs;
  }

  /**
   * Group findings by severity
   */
  private groupFindingsBySeverity(findings: EnrichedFinding[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const finding of findings) {
      groups[finding.severity] = (groups[finding.severity] || 0) + 1;
    }
    return groups;
  }

  /**
   * Calculate final hunt metrics
   */
  private calculateFinalMetrics(execution: HuntExecution): HuntMetrics {
    const findingsBySeverity = this.groupFindingsBySeverity(execution.enrichedFindings);
    const findingsByClassification: Record<string, number> = {};

    for (const finding of execution.enrichedFindings) {
      findingsByClassification[finding.classification] =
        (findingsByClassification[finding.classification] || 0) + 1;
    }

    return {
      totalHypothesesTested: execution.hypotheses.length,
      totalQueriesExecuted: execution.queries.length,
      totalFindingsDiscovered: execution.enrichedFindings.length,
      findingsBySeverity: findingsBySeverity as any,
      findingsByClassification,
      iocsDiscovered: execution.enrichedFindings.reduce(
        (sum, f) => sum + f.iocsIdentified.length,
        0
      ),
      entitiesAnalyzed: execution.queryResults.reduce(
        (sum, r) => sum + r.recordCount,
        0
      ),
      precisionEstimate: execution.metrics.precisionEstimate || 0,
      falsePositiveRate: 1 - (execution.metrics.precisionEstimate || 0),
      executionTimeMs: execution.endTime
        ? execution.endTime - execution.startTime
        : Date.now() - execution.startTime,
      llmTokensUsed: execution.metrics.llmTokensUsed || 0,
      remediationActionsExecuted: execution.metrics.remediationActionsExecuted || 0,
      remediationSuccessRate: execution.metrics.remediationSuccessRate || 0,
    };
  }

  /**
   * Calculate hunt progress
   */
  private calculateProgress(execution: HuntExecution): number {
    const phases: HuntStatus[] = [
      'initializing',
      'generating_hypotheses',
      'executing_queries',
      'analyzing_results',
      'enriching_findings',
      'remediating',
      'completed',
    ];

    const currentIndex = phases.indexOf(execution.context.status);
    if (currentIndex === -1) return 0;

    return (currentIndex / (phases.length - 1)) * 100;
  }

  /**
   * Get current phase name
   */
  private getCurrentPhase(status: HuntStatus): string {
    const phaseNames: Record<HuntStatus, string> = {
      initializing: 'Initializing Hunt',
      generating_hypotheses: 'Generating Hypotheses',
      executing_queries: 'Executing Graph Queries',
      analyzing_results: 'Analyzing Results',
      enriching_findings: 'Enriching with CTI/OSINT',
      remediating: 'Executing Remediation',
      completed: 'Hunt Complete',
      failed: 'Hunt Failed',
      cancelled: 'Hunt Cancelled',
    };

    return phaseNames[status] || 'Unknown';
  }

  /**
   * Estimate hunt duration
   */
  private estimateHuntDuration(configuration: HuntConfiguration): number {
    // Base estimate: 2 minutes
    let estimate = 120000;

    // Add time for more hypotheses
    estimate += 30000; // ~30s for hypothesis generation

    // Add time for query execution
    estimate += 60000; // ~60s for query execution

    // Add time for analysis
    estimate += 45000; // ~45s for analysis

    // Add time for CTI/OSINT enrichment
    estimate += 30000;

    // Add time for remediation if enabled
    if (configuration.autoRemediate) {
      estimate += 60000;
    }

    return estimate;
  }

  /**
   * Estimate remaining time
   */
  private estimateRemainingTime(execution: HuntExecution, progress: number): number {
    if (progress >= 100) return 0;

    const elapsed = Date.now() - execution.startTime;
    const progressDecimal = progress / 100;

    if (progressDecimal === 0) {
      return this.estimateHuntDuration(execution.context.configuration);
    }

    const totalEstimate = elapsed / progressDecimal;
    return Math.max(0, totalEstimate - elapsed);
  }

  /**
   * Mock LLM completion for demonstration
   */
  private async mockLLMComplete(params: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<{
    content: string;
    tokensUsed: { prompt: number; completion: number; total: number };
    latencyMs: number;
  }> {
    // Simulate API latency
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Determine response type from system prompt
    if (params.systemPrompt.includes('hypotheses')) {
      return {
        content: JSON.stringify({
          hypotheses: [
            {
              id: 'hypothesis-1',
              statement: 'Detect lateral movement through RDP connections from non-standard sources',
              mitreAttackTechniques: [
                { id: 'T1021.001', name: 'Remote Desktop Protocol', tactic: 'Lateral Movement' },
              ],
              requiredQueryTemplate: 'lateral_movement_chain',
              expectedIndicators: ['Multiple RDP connections', 'Off-hours access', 'New source IPs'],
              confidenceLevel: 0.85,
              priority: 1,
              rationale: 'RDP is commonly abused for lateral movement',
              dataRequirements: ['Network connections', 'Authentication logs'],
            },
            {
              id: 'hypothesis-2',
              statement: 'Identify credential spraying attacks against Active Directory',
              mitreAttackTechniques: [
                { id: 'T1110.003', name: 'Password Spraying', tactic: 'Credential Access' },
              ],
              requiredQueryTemplate: 'credential_spray_detection',
              expectedIndicators: ['Multiple failed logins', 'Same password different accounts'],
              confidenceLevel: 0.80,
              priority: 2,
              rationale: 'Password spraying is a common initial access technique',
              dataRequirements: ['Authentication logs', 'User accounts'],
            },
          ],
          priorityOrder: ['hypothesis-1', 'hypothesis-2'],
        }),
        tokensUsed: { prompt: 500, completion: 800, total: 1300 },
        latencyMs: 500,
      };
    }

    if (params.systemPrompt.includes('Cypher')) {
      return {
        content: JSON.stringify({
          queries: [
            {
              id: 'query-1',
              hypothesisId: 'hypothesis-1',
              query:
                'MATCH (source:Entity)-[r:CONNECTED_TO]->(target:Entity) WHERE r.protocol = "RDP" AND r.timestamp > datetime() - duration({hours: 24}) RETURN source, r, target LIMIT 100',
              params: { hours: 24 },
              templateUsed: 'lateral_movement_chain',
              estimatedComplexity: 30,
              estimatedResultSize: 50,
            },
          ],
          metadata: {
            templatesCached: 2,
            queriesGenerated: 1,
            validationsPassed: 1,
          },
        }),
        tokensUsed: { prompt: 600, completion: 400, total: 1000 },
        latencyMs: 400,
      };
    }

    if (params.systemPrompt.includes('analyst')) {
      return {
        content: JSON.stringify({
          findings: [
            {
              id: 'finding-1',
              hypothesisId: 'hypothesis-1',
              severity: 'HIGH',
              confidence: 0.88,
              classification: 'LATERAL_MOVEMENT',
              entitiesInvolved: [
                { id: 'host-1', type: 'HOST', name: 'WORKSTATION-001', riskScore: 0.7 },
              ],
              iocsIdentified: [
                {
                  id: 'ioc-1',
                  type: 'IP_ADDRESS',
                  value: '192.168.1.100',
                  confidence: 0.85,
                  source: 'internal',
                  firstSeen: new Date().toISOString(),
                  lastSeen: new Date().toISOString(),
                  tags: ['lateral-movement'],
                },
              ],
              ttpsMatched: [
                { id: 'T1021.001', name: 'Remote Desktop Protocol', tactic: 'Lateral Movement' },
              ],
              recommendedActions: [
                {
                  id: 'action-1',
                  type: 'ISOLATE_HOST',
                  description: 'Isolate affected workstation',
                  priority: 1,
                  automated: true,
                  estimatedImpact: {
                    businessImpact: 'MEDIUM',
                    affectedSystems: 1,
                    estimatedDowntime: 30,
                    reversible: true,
                  },
                  prerequisites: [],
                },
              ],
              autoRemediationEligible: true,
              evidenceSummary: 'Detected unusual RDP connections from non-standard source',
            },
          ],
          precisionEstimate: 0.91,
          falsePositiveIndicators: [],
        }),
        tokensUsed: { prompt: 700, completion: 900, total: 1600 },
        latencyMs: 600,
      };
    }

    return {
      content: '{}',
      tokensUsed: { prompt: 100, completion: 50, total: 150 },
      latencyMs: 200,
    };
  }

  /**
   * Emit hunt event
   */
  private emitEvent(type: HuntEvent['type'], data: Record<string, unknown>): void {
    const event: HuntEvent = {
      type,
      huntId: data.huntId as string,
      timestamp: new Date(),
      data,
    };

    this.emit(type, event);
    this.emit('hunt_event', event);
  }

  /**
   * Setup event forwarding from sub-components
   */
  private setupEventForwarding(): void {
    this.llmExecutor.on('hypotheses_generated', (data) =>
      this.emit('hypotheses_generated', data)
    );
    this.llmExecutor.on('queries_generated', (data) =>
      this.emit('queries_generated', data)
    );
    this.llmExecutor.on('results_analyzed', (data) =>
      this.emit('results_analyzed', data)
    );

    this.remediationHooks.on('findings_enriched', (data) =>
      this.emit('findings_enriched', data)
    );
    this.remediationHooks.on('remediation_completed', (data) =>
      this.emit('remediation_completed', data)
    );
    this.remediationHooks.on('ioc_confirmed', (data) =>
      this.emit('ioc_confirmed', data)
    );
  }

  /**
   * Ensure orchestrator is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Get all active hunts
   */
  getActiveHunts(): Array<{ huntId: string; status: HuntStatus; startTime: number }> {
    return Array.from(this.executions.entries())
      .filter(
        ([, exec]) =>
          exec.context.status !== 'completed' &&
          exec.context.status !== 'failed' &&
          exec.context.status !== 'cancelled'
      )
      .map(([huntId, exec]) => ({
        huntId,
        status: exec.context.status,
        startTime: exec.startTime,
      }));
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    totalHunts: number;
    completedHunts: number;
    failedHunts: number;
    activeHunts: number;
    avgPrecision: number;
  } {
    const executions = Array.from(this.executions.values());
    const completed = executions.filter((e) => e.context.status === 'completed');
    const failed = executions.filter((e) => e.context.status === 'failed');
    const active = executions.filter(
      (e) =>
        e.context.status !== 'completed' &&
        e.context.status !== 'failed' &&
        e.context.status !== 'cancelled'
    );

    const avgPrecision =
      completed.length > 0
        ? completed.reduce((sum, e) => sum + (e.metrics.precisionEstimate || 0), 0) /
          completed.length
        : 0;

    return {
      totalHunts: executions.length,
      completedHunts: completed.length,
      failedHunts: failed.length,
      activeHunts: active.length,
      avgPrecision,
    };
  }
}

export const threatHuntingOrchestrator = new ThreatHuntingOrchestrator();
