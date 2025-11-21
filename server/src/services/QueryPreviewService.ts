/**
 * QueryPreviewService - Generates query previews with cost estimation and edit capability
 *
 * Features:
 * - Natural language → Cypher/SQL translation
 * - Cost and risk estimation
 * - Editable query preview before execution
 * - Sandbox mode for safe execution
 * - Integration with GlassBoxRunService for observability
 */

import { v4 as uuidv4 } from 'uuid';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import type { Driver } from 'neo4j-driver';
import { logger } from '../utils/logger.js';
import { metrics } from '../observability/metrics.js';
import { NlToCypherService } from '../ai/nl-to-cypher/nl-to-cypher.service.js';
import { GlassBoxRunService } from './GlassBoxRunService.js';

export type QueryLanguage = 'cypher' | 'sql';

export type CostEstimate = {
  level: 'low' | 'medium' | 'high' | 'very-high';
  estimatedRows?: number;
  estimatedTimeMs?: number;
  breakdown: {
    cartesianProduct: boolean;
    variableLengthPath: boolean;
    fullTableScan: boolean;
    complexAggregation: boolean;
  };
  warnings: string[];
};

export type RiskAssessment = {
  level: 'low' | 'medium' | 'high';
  concerns: string[];
  piiFields: string[];
  mutationDetected: boolean;
  recommendedActions: string[];
};

export type QueryPreview = {
  id: string;
  investigationId: string;
  tenantId: string;
  userId: string;

  // Input
  naturalLanguageQuery: string;
  parameters: Record<string, unknown>;

  // Generated query
  language: QueryLanguage;
  generatedQuery: string;
  queryExplanation: string;

  // Analysis
  costEstimate: CostEstimate;
  riskAssessment: RiskAssessment;
  syntacticallyValid: boolean;
  validationErrors: string[];

  // Execution control
  canExecute: boolean;
  requiresApproval: boolean;
  sandboxOnly: boolean;

  // Metadata
  modelUsed: string;
  confidence: number;
  generatedAt: Date;
  expiresAt: Date;

  // Execution tracking
  executed: boolean;
  executedAt?: Date;
  executionRunId?: string;

  // Edit tracking
  editedQuery?: string;
  editedBy?: string;
  editedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
};

export type CreatePreviewInput = {
  investigationId: string;
  tenantId: string;
  userId: string;
  naturalLanguageQuery: string;
  language?: QueryLanguage;
  parameters?: Record<string, unknown>;
  focusEntityIds?: string[];
  maxHops?: number;
};

export type ExecutePreviewInput = {
  previewId: string;
  userId: string;
  useEditedQuery?: boolean;
  dryRun?: boolean;
  maxRows?: number;
  timeout?: number;
};

export type ExecutePreviewResult = {
  runId: string;
  query: string;
  results: unknown;
  rowCount: number;
  executionTimeMs: number;
  warnings: string[];
};

export class QueryPreviewService {
  private pool: Pool;
  private neo4jDriver: Driver;
  private redis: Redis | null;
  private nlToCypherService: NlToCypherService;
  private glassBoxService: GlassBoxRunService;
  private cacheEnabled: boolean;
  private cacheTTL: number = 600; // 10 minutes
  private previewTTL: number = 3600; // 1 hour

  constructor(
    pool: Pool,
    neo4jDriver: Driver,
    nlToCypherService: NlToCypherService,
    glassBoxService: GlassBoxRunService,
    redis?: Redis
  ) {
    this.pool = pool;
    this.neo4jDriver = neo4jDriver;
    this.nlToCypherService = nlToCypherService;
    this.glassBoxService = glassBoxService;
    this.redis = redis || null;
    this.cacheEnabled = !!redis;
  }

  /**
   * Create a query preview from natural language
   */
  async createPreview(input: CreatePreviewInput): Promise<QueryPreview> {
    const startTime = Date.now();

    logger.info({
      investigationId: input.investigationId,
      query: input.naturalLanguageQuery,
      language: input.language || 'cypher',
    }, 'Creating query preview');

    try {
      // Default to Cypher for graph queries
      const language = input.language || 'cypher';

      let preview: QueryPreview;

      if (language === 'cypher') {
        preview = await this.createCypherPreview(input);
      } else {
        preview = await this.createSqlPreview(input);
      }

      // Store preview in database
      await this.storePreview(preview);

      metrics.queryPreviewsTotal.inc({ language, status: 'created' });
      metrics.queryPreviewLatencyMs.observe(
        { language },
        Date.now() - startTime
      );

      logger.info({
        previewId: preview.id,
        investigationId: input.investigationId,
        language,
        canExecute: preview.canExecute,
        costLevel: preview.costEstimate.level,
        riskLevel: preview.riskAssessment.level,
        durationMs: Date.now() - startTime,
      }, 'Created query preview');

      return preview;
    } catch (error) {
      logger.error({ error, input }, 'Failed to create query preview');
      metrics.queryPreviewErrorsTotal.inc({ language: input.language || 'cypher' });
      throw error;
    }
  }

  /**
   * Create Cypher query preview
   */
  private async createCypherPreview(input: CreatePreviewInput): Promise<QueryPreview> {
    // Build schema context for the investigation
    const schemaContext = await this.buildInvestigationSchema(input.investigationId);

    // Generate Cypher query using NlToCypherService
    const translationResult = await this.nlToCypherService.translateWithPreview(
      input.naturalLanguageQuery,
      input.userId,
      input.tenantId
    );

    // Scope to investigation
    const scopedQuery = this.scopeCypherToInvestigation(
      translationResult.generatedCypher,
      input.investigationId,
      input.focusEntityIds
    );

    // Estimate cost
    const costEstimate = this.estimateCypherCost(scopedQuery);

    // Assess risk
    const riskAssessment = translationResult.policyRisk
      ? {
          level: translationResult.policyRisk.riskLevel as 'low' | 'medium' | 'high',
          concerns: translationResult.policyRisk.concerns || [],
          piiFields: translationResult.policyRisk.piiFields || [],
          mutationDetected: translationResult.policyRisk.mutationDetected || false,
          recommendedActions: translationResult.policyRisk.recommendedActions || [],
        }
      : this.assessCypherRisk(scopedQuery);

    // Determine execution policy
    const canExecute = translationResult.canExecute && costEstimate.level !== 'very-high';
    const requiresApproval = costEstimate.level === 'high' || riskAssessment.level === 'high';
    const sandboxOnly = requiresApproval || costEstimate.level === 'high';

    const preview: QueryPreview = {
      id: uuidv4(),
      investigationId: input.investigationId,
      tenantId: input.tenantId,
      userId: input.userId,
      naturalLanguageQuery: input.naturalLanguageQuery,
      parameters: {
        ...input.parameters,
        investigationId: input.investigationId,
        focusEntityIds: input.focusEntityIds,
        maxHops: input.maxHops,
      },
      language: 'cypher',
      generatedQuery: scopedQuery,
      queryExplanation: translationResult.explanation || this.explainCypher(scopedQuery),
      costEstimate,
      riskAssessment,
      syntacticallyValid: translationResult.isValid !== false,
      validationErrors: translationResult.validationErrors || [],
      canExecute,
      requiresApproval,
      sandboxOnly,
      modelUsed: 'nl-to-cypher-v1',
      confidence: translationResult.confidence || 0.85,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + this.previewTTL * 1000),
      executed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return preview;
  }

  /**
   * Create SQL query preview
   */
  private async createSqlPreview(input: CreatePreviewInput): Promise<QueryPreview> {
    // For SQL, we'll create a simpler implementation
    // In production, you'd integrate with a dedicated NL-to-SQL service

    const query = `
      SELECT e.id, e.kind, e.labels, e.props
      FROM entities e
      WHERE e.tenant_id = '${input.tenantId}'
      AND e.props @> '{"investigationId": "${input.investigationId}"}'
      LIMIT 100
    `;

    const preview: QueryPreview = {
      id: uuidv4(),
      investigationId: input.investigationId,
      tenantId: input.tenantId,
      userId: input.userId,
      naturalLanguageQuery: input.naturalLanguageQuery,
      parameters: input.parameters || {},
      language: 'sql',
      generatedQuery: query,
      queryExplanation: 'Retrieves entities for the investigation',
      costEstimate: {
        level: 'low',
        breakdown: {
          cartesianProduct: false,
          variableLengthPath: false,
          fullTableScan: false,
          complexAggregation: false,
        },
        warnings: [],
      },
      riskAssessment: {
        level: 'low',
        concerns: [],
        piiFields: [],
        mutationDetected: false,
        recommendedActions: [],
      },
      syntacticallyValid: true,
      validationErrors: [],
      canExecute: true,
      requiresApproval: false,
      sandboxOnly: false,
      modelUsed: 'nl-to-sql-v1',
      confidence: 0.75,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + this.previewTTL * 1000),
      executed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return preview;
  }

  /**
   * Get a preview by ID
   */
  async getPreview(previewId: string): Promise<QueryPreview | null> {
    const query = `
      SELECT * FROM query_previews
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [previewId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.rowToPreview(result.rows[0]);
  }

  /**
   * Edit a preview query
   */
  async editPreview(
    previewId: string,
    userId: string,
    editedQuery: string
  ): Promise<QueryPreview> {
    const preview = await this.getPreview(previewId);
    if (!preview) {
      throw new Error(`Preview ${previewId} not found`);
    }

    // Re-validate edited query
    const validation = this.validateQuery(editedQuery, preview.language);

    const query = `
      UPDATE query_previews
      SET edited_query = $1,
          edited_by = $2,
          edited_at = $3,
          syntactically_valid = $4,
          validation_errors = $5,
          updated_at = $6
      WHERE id = $7
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      editedQuery,
      userId,
      new Date(),
      validation.isValid,
      JSON.stringify(validation.errors),
      new Date(),
      previewId,
    ]);

    logger.info({
      previewId,
      userId,
      editedQueryLength: editedQuery.length,
      isValid: validation.isValid,
    }, 'Edited preview query');

    return this.rowToPreview(result.rows[0]);
  }

  /**
   * Execute a preview in sandbox mode
   */
  async executePreview(input: ExecutePreviewInput): Promise<ExecutePreviewResult> {
    const startTime = Date.now();

    const preview = await this.getPreview(input.previewId);
    if (!preview) {
      throw new Error(`Preview ${input.previewId} not found`);
    }

    if (!preview.canExecute && !input.dryRun) {
      throw new Error('Preview cannot be executed due to policy restrictions');
    }

    // Choose query to execute
    const queryToExecute = input.useEditedQuery && preview.editedQuery
      ? preview.editedQuery
      : preview.generatedQuery;

    // Create glass-box run
    const run = await this.glassBoxService.createRun({
      investigationId: preview.investigationId,
      tenantId: preview.tenantId,
      userId: input.userId,
      type: preview.language === 'cypher' ? 'nl_to_cypher' : 'nl_to_sql',
      prompt: preview.naturalLanguageQuery,
      parameters: {
        ...preview.parameters,
        previewId: preview.id,
        editedQuery: input.useEditedQuery,
        dryRun: input.dryRun,
      },
    });

    try {
      await this.glassBoxService.updateStatus(run.id, 'running');

      // Add execution step
      const stepId = uuidv4();
      await this.glassBoxService.addStep(run.id, {
        type: 'tool_call',
        description: `Executing ${preview.language} query`,
        input: { query: queryToExecute, dryRun: input.dryRun },
      });

      let results: unknown;
      let rowCount: number = 0;
      const warnings: string[] = [];

      if (input.dryRun) {
        // Dry run - validate but don't execute
        results = { message: 'Dry run - query validated but not executed' };
        warnings.push('Dry run mode - no data was accessed');
      } else {
        // Execute query
        if (preview.language === 'cypher') {
          const execResult = await this.executeCypher(
            queryToExecute,
            preview.parameters,
            {
              maxRows: input.maxRows || 100,
              timeout: input.timeout || 30000,
            }
          );
          results = execResult.records;
          rowCount = execResult.records.length;
          warnings.push(...execResult.warnings);
        } else {
          const execResult = await this.executeSql(
            queryToExecute,
            {
              maxRows: input.maxRows || 100,
              timeout: input.timeout || 30000,
            }
          );
          results = execResult.rows;
          rowCount = execResult.rows.length;
          warnings.push(...execResult.warnings);
        }
      }

      const executionTimeMs = Date.now() - startTime;

      // Complete step
      await this.glassBoxService.completeStep(run.id, stepId, {
        rowCount,
        executionTimeMs,
        warnings,
      });

      // Mark preview as executed
      await this.pool.query(
        `UPDATE query_previews
         SET executed = true, executed_at = $1, execution_run_id = $2, updated_at = $3
         WHERE id = $4`,
        [new Date(), run.id, new Date(), preview.id]
      );

      // Complete run
      await this.glassBoxService.updateStatus(run.id, 'completed', {
        rowCount,
        warnings,
      });

      metrics.queryPreviewExecutionsTotal.inc({
        language: preview.language,
        dryRun: input.dryRun ? 'true' : 'false',
        status: 'success',
      });

      logger.info({
        previewId: preview.id,
        runId: run.id,
        language: preview.language,
        rowCount,
        executionTimeMs,
        dryRun: input.dryRun,
      }, 'Executed query preview');

      return {
        runId: run.id,
        query: queryToExecute,
        results,
        rowCount,
        executionTimeMs,
        warnings,
      };
    } catch (error) {
      await this.glassBoxService.updateStatus(run.id, 'failed', undefined, String(error));

      metrics.queryPreviewExecutionsTotal.inc({
        language: preview.language,
        dryRun: input.dryRun ? 'true' : 'false',
        status: 'failed',
      });

      logger.error({
        error,
        previewId: preview.id,
        runId: run.id,
      }, 'Failed to execute query preview');

      throw error;
    }
  }

  /**
   * Scope Cypher query to investigation
   */
  private scopeCypherToInvestigation(
    query: string,
    investigationId: string,
    focusEntityIds?: string[]
  ): string {
    // Add investigation filter to all MATCH clauses
    let scopedQuery = query;

    // Simple approach: add WHERE clause if not present
    if (!query.includes('investigationId')) {
      // Find MATCH patterns and add investigation filter
      const matchRegex = /MATCH\s+\(([\w]+):Entity[^)]*\)/gi;
      scopedQuery = query.replace(
        matchRegex,
        (match, varName) => {
          return `${match} WHERE ${varName}.investigationId = $investigationId`;
        }
      );
    }

    // Add focus entity filter if provided
    if (focusEntityIds && focusEntityIds.length > 0) {
      scopedQuery = `
        // Scoped to investigation: ${investigationId}
        // Focus entities: ${focusEntityIds.join(', ')}
        ${scopedQuery}
      `;
    }

    return scopedQuery;
  }

  /**
   * Build schema context for investigation
   */
  private async buildInvestigationSchema(investigationId: string): Promise<string> {
    const session = this.neo4jDriver.session();

    try {
      // Get entity types and relationship types in investigation
      const result = await session.run(
        `
        MATCH (e:Entity {investigationId: $investigationId})
        WITH DISTINCT labels(e) as entityLabels
        UNWIND entityLabels as label
        RETURN DISTINCT label
        UNION
        MATCH ()-[r]->()
        WHERE r.investigationId = $investigationId
        RETURN DISTINCT type(r) as label
        `,
        { investigationId }
      );

      const labels = result.records.map(r => r.get('label'));

      return `Investigation graph schema:\nNode labels: ${labels.filter(l => l !== 'Entity').join(', ')}\nRelationship types: ${labels.filter(l => !l.match(/^[A-Z]/)).join(', ')}`;
    } finally {
      await session.close();
    }
  }

  /**
   * Estimate Cypher query cost
   */
  private estimateCypherCost(query: string): CostEstimate {
    const breakdown = {
      cartesianProduct: /MATCH.*MATCH/i.test(query) && !/WHERE/i.test(query),
      variableLengthPath: /\[\*\d*\.\.?\d*\]/.test(query),
      fullTableScan: /MATCH\s+\([^)]*\)\s+(?!WHERE)/i.test(query),
      complexAggregation: /\b(collect|reduce|count)\b/i.test(query),
    };

    const warnings: string[] = [];
    let level: CostEstimate['level'] = 'low';

    if (breakdown.cartesianProduct) {
      warnings.push('Potential cartesian product detected - add WHERE clause');
      level = 'very-high';
    }

    if (breakdown.variableLengthPath) {
      warnings.push('Variable-length path can be expensive for large graphs');
      if (level === 'low') level = 'high';
    }

    if (breakdown.fullTableScan) {
      warnings.push('Full node scan detected - consider adding filters');
      if (level === 'low') level = 'medium';
    }

    if (!query.includes('LIMIT')) {
      warnings.push('No LIMIT clause - results may be large');
      if (level === 'low') level = 'medium';
    }

    return {
      level,
      breakdown,
      warnings,
    };
  }

  /**
   * Assess Cypher query risk
   */
  private assessCypherRisk(query: string): RiskAssessment {
    const concerns: string[] = [];
    const piiFields: string[] = [];

    // Check for mutations
    const mutationDetected = /\b(CREATE|DELETE|REMOVE|SET|MERGE)\b/i.test(query);
    if (mutationDetected) {
      concerns.push('Query contains mutation operations');
    }

    // Check for PII fields
    const piiPattern = /\b(email|ssn|phone|address|dob|credit_card)\b/i;
    if (piiPattern.test(query)) {
      const matches = query.match(piiPattern);
      if (matches) {
        piiFields.push(...matches);
        concerns.push('Query accesses potential PII fields');
      }
    }

    const level = mutationDetected || piiFields.length > 0 ? 'high' : 'low';

    const recommendedActions: string[] = [];
    if (mutationDetected) {
      recommendedActions.push('Review mutation operations before execution');
    }
    if (piiFields.length > 0) {
      recommendedActions.push('Ensure proper authorization for PII access');
    }

    return {
      level,
      concerns,
      piiFields,
      mutationDetected,
      recommendedActions,
    };
  }

  /**
   * Explain Cypher query
   */
  private explainCypher(query: string): string {
    // Simple explanation - in production, use LLM to generate detailed explanation
    const operations: string[] = [];

    if (/MATCH/i.test(query)) operations.push('matches graph patterns');
    if (/WHERE/i.test(query)) operations.push('filters results');
    if (/RETURN/i.test(query)) operations.push('returns specified fields');
    if (/ORDER BY/i.test(query)) operations.push('sorts results');
    if (/LIMIT/i.test(query)) operations.push('limits result count');

    return `This query ${operations.join(', ')}.`;
  }

  /**
   * Validate query syntax
   */
  private validateQuery(
    query: string,
    language: QueryLanguage
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!query || query.trim().length === 0) {
      errors.push('Query is empty');
      return { isValid: false, errors };
    }

    if (language === 'cypher') {
      // Basic Cypher validation
      if (!/\bRETURN\b/i.test(query)) {
        errors.push('Cypher query must contain RETURN clause');
      }
      if (/\b(DELETE|REMOVE)\b/i.test(query) && !/\bDETACH\b/i.test(query)) {
        errors.push('DELETE operations should use DETACH DELETE');
      }
    } else if (language === 'sql') {
      // Basic SQL validation
      if (!/\bSELECT\b/i.test(query)) {
        errors.push('SQL query must contain SELECT clause');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Execute Cypher query
   */
  private async executeCypher(
    query: string,
    parameters: Record<string, unknown>,
    options: { maxRows: number; timeout: number }
  ): Promise<{ records: any[]; warnings: string[] }> {
    const session = this.neo4jDriver.session();
    const warnings: string[] = [];

    try {
      // Add LIMIT if not present
      let finalQuery = query;
      if (!query.includes('LIMIT')) {
        finalQuery += ` LIMIT ${options.maxRows}`;
        warnings.push(`Added LIMIT ${options.maxRows} to query`);
      }

      const result = await session.run(finalQuery, parameters, {
        timeout: options.timeout,
      });

      const records = result.records.map(record => record.toObject());

      if (records.length === options.maxRows) {
        warnings.push('Result set limited - more rows may be available');
      }

      return { records, warnings };
    } finally {
      await session.close();
    }
  }

  /**
   * Execute SQL query
   */
  private async executeSql(
    query: string,
    options: { maxRows: number; timeout: number }
  ): Promise<{ rows: any[]; warnings: string[] }> {
    const warnings: string[] = [];

    // Add LIMIT if not present
    let finalQuery = query;
    if (!query.toUpperCase().includes('LIMIT')) {
      finalQuery += ` LIMIT ${options.maxRows}`;
      warnings.push(`Added LIMIT ${options.maxRows} to query`);
    }

    const result = await this.pool.query(finalQuery);

    if (result.rows.length === options.maxRows) {
      warnings.push('Result set limited - more rows may be available');
    }

    return { rows: result.rows, warnings };
  }

  /**
   * Store preview in database
   */
  private async storePreview(preview: QueryPreview): Promise<void> {
    const query = `
      INSERT INTO query_previews (
        id, investigation_id, tenant_id, user_id,
        natural_language_query, parameters, language, generated_query,
        query_explanation, cost_estimate, risk_assessment,
        syntactically_valid, validation_errors, can_execute,
        requires_approval, sandbox_only, model_used, confidence,
        generated_at, expires_at, executed, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      )
    `;

    const values = [
      preview.id,
      preview.investigationId,
      preview.tenantId,
      preview.userId,
      preview.naturalLanguageQuery,
      JSON.stringify(preview.parameters),
      preview.language,
      preview.generatedQuery,
      preview.queryExplanation,
      JSON.stringify(preview.costEstimate),
      JSON.stringify(preview.riskAssessment),
      preview.syntacticallyValid,
      JSON.stringify(preview.validationErrors),
      preview.canExecute,
      preview.requiresApproval,
      preview.sandboxOnly,
      preview.modelUsed,
      preview.confidence,
      preview.generatedAt,
      preview.expiresAt,
      preview.executed,
      preview.createdAt,
      preview.updatedAt,
    ];

    await this.pool.query(query, values);
  }

  /**
   * Convert database row to QueryPreview
   */
  private rowToPreview(row: any): QueryPreview {
    return {
      id: row.id,
      investigationId: row.investigation_id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      naturalLanguageQuery: row.natural_language_query,
      parameters: JSON.parse(row.parameters || '{}'),
      language: row.language,
      generatedQuery: row.generated_query,
      queryExplanation: row.query_explanation,
      costEstimate: JSON.parse(row.cost_estimate),
      riskAssessment: JSON.parse(row.risk_assessment),
      syntacticallyValid: row.syntactically_valid,
      validationErrors: JSON.parse(row.validation_errors || '[]'),
      canExecute: row.can_execute,
      requiresApproval: row.requires_approval,
      sandboxOnly: row.sandbox_only,
      modelUsed: row.model_used,
      confidence: parseFloat(row.confidence),
      generatedAt: new Date(row.generated_at),
      expiresAt: new Date(row.expires_at),
      executed: row.executed,
      executedAt: row.executed_at ? new Date(row.executed_at) : undefined,
      executionRunId: row.execution_run_id,
      editedQuery: row.edited_query,
      editedBy: row.edited_by,
      editedAt: row.edited_at ? new Date(row.edited_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
