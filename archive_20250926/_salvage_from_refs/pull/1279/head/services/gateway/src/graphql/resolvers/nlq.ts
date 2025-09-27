/**
 * NL→Cypher GraphQL Resolvers
 *
 * Implements GraphQL resolvers for natural language query interface
 * with constraint enforcement and explanation system.
 */

import { GraphQLResolveInfo, GraphQLScalarType, Kind } from 'graphql';
import { IResolvers } from '@graphql-tools/utils';
import pino from 'pino';
import { randomUUID } from 'crypto';

import { NlToCypherGuardrails, defaultGuardrails } from '../../nl2cypher/guardrails';
import { Neo4jCypherExecutor } from '../../nl2cypher/executor/neo4j';
import { INlToCypherTranslator, TranslationRequest, ExecutionRequest } from '../../nl2cypher/translator/interface';
import { businessMetrics } from '../../observability/telemetry';

const logger = pino({ name: 'nlq-resolvers' });

// Mock translator implementation (replace with actual implementation)
class MockNlToCypherTranslator implements INlToCypherTranslator {
  async translate(request: TranslationRequest) {
    // Mock translation logic - replace with actual AI model
    const cypher = this.mockTranslate(request.prompt);

    const analysis = await defaultGuardrails.checkConstraints(cypher, {
      user_id: request.context.user_id,
      tenant_id: request.context.tenant_id,
      scopes: request.context.scopes,
      enforcement_mode: request.options?.enforcement_mode
    });

    return {
      request_id: randomUUID(),
      cypher: analysis.modified_cypher || cypher,
      original_cypher: analysis.modified_cypher ? cypher : undefined,
      confidence: 0.85,
      constraint_analysis: analysis,
      metadata: {
        translation_time_ms: 150,
        constraint_time_ms: 50,
        model_version: 'mock-v1.0',
        schema_version: '1.0',
        prompt_tokens: request.prompt.split(' ').length,
        completion_tokens: cypher.split(' ').length
      }
    };
  }

  async preview(request: TranslationRequest) {
    return this.translate(request);
  }

  async validate(cypher: string, context: { user_id: string; tenant_id: string }) {
    const analysis = await defaultGuardrails.checkConstraints(cypher, context);

    return {
      is_valid: analysis.is_allowed,
      syntax_errors: [],
      constraint_analysis: analysis
    };
  }

  async getSchema(context: { tenant_id: string }) {
    // Mock schema - replace with actual Neo4j schema discovery
    return {
      node_labels: ['Person', 'Company', 'Transaction', 'Account'],
      relationship_types: ['WORKS_FOR', 'OWNS', 'TRANSFERS_TO', 'LOCATED_IN'],
      property_keys: {
        Person: ['name', 'age', 'email', 'created_at'],
        Company: ['name', 'industry', 'founded', 'revenue'],
        Transaction: ['amount', 'timestamp', 'type', 'status'],
        Account: ['number', 'balance', 'type', 'opened']
      },
      indexes: [
        { label: 'Person', properties: ['email'], type: 'btree' as const },
        { label: 'Company', properties: ['name'], type: 'btree' as const }
      ],
      constraints: [
        { label: 'Person', properties: ['email'], type: 'unique' as const },
        { label: 'Company', properties: ['name'], type: 'unique' as const }
      ]
    };
  }

  async refreshSchema(context: { tenant_id: string }) {
    // Mock refresh
    logger.info({ tenant_id: context.tenant_id }, 'Schema cache refreshed');
  }

  private mockTranslate(prompt: string): string {
    // Simple mock translation based on keywords
    const lower = prompt.toLowerCase();

    if (lower.includes('person') && lower.includes('company')) {
      return 'MATCH (p:Person)-[:WORKS_FOR]->(c:Company) RETURN p.name, c.name LIMIT 10';
    }

    if (lower.includes('transaction')) {
      return 'MATCH (t:Transaction) WHERE t.amount > 1000 RETURN t ORDER BY t.timestamp DESC LIMIT 10';
    }

    if (lower.includes('account')) {
      return 'MATCH (a:Account) RETURN a.number, a.balance, a.type LIMIT 10';
    }

    // Default fallback
    return 'MATCH (n) RETURN labels(n), count(n) LIMIT 10';
  }
}

// Initialize services
const translator = new MockNlToCypherTranslator();
const executor = new Neo4jCypherExecutor({
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  username: process.env.NEO4J_USERNAME || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password',
  database: process.env.NEO4J_DATABASE || 'neo4j'
});

// JSON scalar type
const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON scalar type',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: (ast) => {
    if (ast.kind === Kind.STRING) {
      return JSON.parse(ast.value);
    }
    return null;
  }
});

// Main resolvers
export const nlqResolvers: IResolvers = {
  JSON: JSONScalar,

  Query: {
    nlqPreview: async (_, { input }, context) => {
      const start_time = Date.now();
      const request_id = randomUUID();

      try {
        logger.info({
          request_id,
          user_id: context.user?.id,
          tenant_id: context.tenant?.id,
          prompt: input.prompt
        }, 'NLQ preview request');

        // Track metrics
        businessMetrics.nlqRequests.add(1, {
          tenant_id: context.tenant?.id || 'default',
          operation: 'preview',
          user_role: context.user?.role || 'unknown'
        });

        const translationRequest: TranslationRequest = {
          prompt: input.prompt,
          context: {
            user_id: context.user?.id || 'anonymous',
            tenant_id: context.tenant?.id || 'default',
            user_role: context.user?.role,
            scopes: context.user?.scopes,
            conversation_id: input.conversationId,
            previous_queries: input.previousQueries
          },
          options: {
            max_results: input.maxResults,
            timeout_ms: input.timeoutMs,
            explain_level: input.explainLevel?.toLowerCase() as any,
            include_explanation: input.includeExplanation,
            dry_run: true,
            enforcement_mode: input.enforcementMode?.toLowerCase() as any
          }
        };

        const result = await translator.preview(translationRequest);

        // Generate explanation if requested
        let explanation;
        if (input.includeExplanation) {
          const fullAnalysis = await defaultGuardrails.analyzeWithExplanation(
            result.cypher,
            {
              user_id: translationRequest.context.user_id,
              tenant_id: translationRequest.context.tenant_id,
              user_role: translationRequest.context.user_role,
              scopes: translationRequest.context.scopes,
              enforcement_mode: translationRequest.options?.enforcement_mode,
              explain_level: translationRequest.options?.explain_level,
              include_suggestions: true,
              include_auto_fixes: true
            }
          );
          explanation = fullAnalysis.explanation;
        }

        const duration = Date.now() - start_time;

        // Track latency
        businessMetrics.nlqLatency.record(duration, {
          tenant_id: context.tenant?.id || 'default',
          operation: 'preview'
        });

        return {
          requestId: result.request_id,
          cypher: result.cypher,
          originalCypher: result.original_cypher,
          confidence: result.confidence,
          decision: result.constraint_analysis.is_allowed ? 'ALLOWED' : 'BLOCKED',
          explanation,
          constraintAnalysis: formatConstraintAnalysis(result.constraint_analysis),
          metadata: formatMetadata(result.metadata)
        };

      } catch (error) {
        logger.error({
          request_id,
          error: error.message,
          duration: Date.now() - start_time
        }, 'NLQ preview failed');

        businessMetrics.nlqErrors.add(1, {
          tenant_id: context.tenant?.id || 'default',
          operation: 'preview',
          error_type: error.constructor.name
        });

        throw error;
      }
    },

    nlqExecute: async (_, { input }, context) => {
      const start_time = Date.now();
      const request_id = randomUUID();

      try {
        logger.info({
          request_id,
          user_id: context.user?.id,
          tenant_id: context.tenant?.id,
          has_prompt: !!input.prompt,
          has_cypher: !!input.cypher
        }, 'NLQ execute request');

        businessMetrics.nlqRequests.add(1, {
          tenant_id: context.tenant?.id || 'default',
          operation: 'execute',
          user_role: context.user?.role || 'unknown'
        });

        let cypher = input.cypher;
        let translation_result;

        // Translate if prompt provided
        if (input.prompt && !input.cypher) {
          const translationRequest: TranslationRequest = {
            prompt: input.prompt,
            context: {
              user_id: context.user?.id || 'anonymous',
              tenant_id: context.tenant?.id || 'default',
              user_role: context.user?.role,
              scopes: context.user?.scopes
            },
            options: {
              max_results: input.maxResults,
              timeout_ms: input.timeoutMs,
              explain_level: input.explainLevel?.toLowerCase() as any,
              include_explanation: input.includeExplanation,
              enforcement_mode: input.enforcementMode?.toLowerCase() as any
            }
          };

          translation_result = await translator.translate(translationRequest);
          cypher = translation_result.cypher;
        }

        if (!cypher) {
          throw new Error('Either prompt or cypher must be provided');
        }

        // Execute query if not dry run
        let execution_result;
        if (!input.dryRun) {
          const executionRequest: ExecutionRequest = {
            cypher,
            parameters: input.parameters || {},
            context: {
              user_id: context.user?.id || 'anonymous',
              tenant_id: context.tenant?.id || 'default',
              user_role: context.user?.role,
              scopes: context.user?.scopes,
              request_id
            },
            options: {
              timeout_ms: input.timeoutMs,
              max_results: input.maxResults,
              explain: false,
              dry_run: false
            }
          };

          execution_result = await executor.executeReadOnly(executionRequest);
        } else {
          // Dry run - just validate
          execution_result = {
            request_id,
            results: [],
            columns: [],
            summary: {
              result_count: 0,
              execution_time_ms: 0
            },
            warnings: []
          };
        }

        // Get constraint analysis
        const constraint_analysis = translation_result?.constraint_analysis ||
          await defaultGuardrails.checkConstraints(cypher, {
            user_id: context.user?.id || 'anonymous',
            tenant_id: context.tenant?.id || 'default',
            scopes: context.user?.scopes
          });

        // Generate explanation if requested
        let explanation;
        if (input.includeExplanation) {
          const fullAnalysis = await defaultGuardrails.analyzeWithExplanation(
            cypher,
            {
              user_id: context.user?.id || 'anonymous',
              tenant_id: context.tenant?.id || 'default',
              user_role: context.user?.role,
              scopes: context.user?.scopes,
              explain_level: input.explainLevel?.toLowerCase() as any,
              include_suggestions: true,
              include_auto_fixes: true
            }
          );
          explanation = fullAnalysis.explanation;
        }

        const duration = Date.now() - start_time;

        // Track metrics
        businessMetrics.nlqLatency.record(duration, {
          tenant_id: context.tenant?.id || 'default',
          operation: 'execute'
        });

        if (!input.dryRun) {
          businessMetrics.nlqExecutions.add(1, {
            tenant_id: context.tenant?.id || 'default',
            result_count: execution_result.summary.result_count.toString()
          });
        }

        return {
          requestId: execution_result.request_id,
          cypher,
          originalCypher: translation_result?.original_cypher,
          results: execution_result.results,
          columns: execution_result.columns,
          summary: execution_result.summary,
          queryPlan: execution_result.query_plan && formatQueryPlan(execution_result.query_plan),
          warnings: execution_result.warnings,
          explanation,
          constraintAnalysis: formatConstraintAnalysis(constraint_analysis),
          metadata: translation_result ? formatMetadata(translation_result.metadata) : {
            translationTimeMs: 0,
            constraintTimeMs: 0
          }
        };

      } catch (error) {
        logger.error({
          request_id,
          error: error.message,
          duration: Date.now() - start_time
        }, 'NLQ execute failed');

        businessMetrics.nlqErrors.add(1, {
          tenant_id: context.tenant?.id || 'default',
          operation: 'execute',
          error_type: error.constructor.name
        });

        throw error;
      }
    },

    nlqValidate: async (_, { input }, context) => {
      try {
        const result = await translator.validate(input.cypher, {
          user_id: context.user?.id || 'anonymous',
          tenant_id: context.tenant?.id || 'default'
        });

        return {
          isValid: result.is_valid,
          syntaxErrors: result.syntax_errors,
          constraintAnalysis: formatConstraintAnalysis(result.constraint_analysis)
        };
      } catch (error) {
        logger.error({ error }, 'NLQ validate failed');
        throw error;
      }
    },

    nlqSchema: async (_, { tenantId }, context) => {
      try {
        const schema = await translator.getSchema({ tenant_id: tenantId });

        return {
          nodeLabels: schema.node_labels,
          relationshipTypes: schema.relationship_types,
          propertyKeys: schema.property_keys,
          indexes: schema.indexes.map(formatIndexInfo),
          constraints: schema.constraints.map(formatConstraintInfo),
          version: '1.0'
        };
      } catch (error) {
        logger.error({ error, tenantId }, 'NLQ schema fetch failed');
        throw error;
      }
    }
  },

  Mutation: {
    nlqRefreshSchema: async (_, { tenantId }, context) => {
      try {
        await translator.refreshSchema({ tenant_id: tenantId });
        const schema = await translator.getSchema({ tenant_id: tenantId });

        return {
          nodeLabels: schema.node_labels,
          relationshipTypes: schema.relationship_types,
          propertyKeys: schema.property_keys,
          indexes: schema.indexes.map(formatIndexInfo),
          constraints: schema.constraints.map(formatConstraintInfo),
          version: '1.0'
        };
      } catch (error) {
        logger.error({ error, tenantId }, 'NLQ schema refresh failed');
        throw error;
      }
    },

    nlqUpdateConstraints: async (_, { input }, context) => {
      try {
        // Update constraint configuration
        if (input.readonly || input.limits || input.complexity || input.timeouts || input.patterns) {
          const config = {
            readonly: input.readonly,
            limits: input.limits,
            complexity: input.complexity,
            timeouts: input.timeouts,
            patterns: input.patterns
          };

          defaultGuardrails.updateConstraintConfig(config);

          logger.info({ config }, 'Constraint configuration updated');
        }

        return true;
      } catch (error) {
        logger.error({ error }, 'Constraint update failed');
        throw error;
      }
    }
  }
};

// Helper formatting functions
function formatConstraintAnalysis(analysis: any) {
  return {
    queryId: analysis.query_id,
    originalCypher: analysis.original_cypher,
    modifiedCypher: analysis.modified_cypher,
    violations: analysis.violations.map((v: any) => ({
      code: v.code,
      message: v.message,
      severity: v.severity.toUpperCase(),
      category: v.category.toUpperCase(),
      suggestion: v.suggestion,
      autoFix: v.auto_fix
    })),
    estimatedCost: analysis.estimated_cost,
    complexityScore: analysis.complexity_score,
    isAllowed: analysis.is_allowed,
    enforcementMode: analysis.enforcement_mode.toUpperCase(),
    reasons: analysis.reasons
  };
}

function formatMetadata(metadata: any) {
  return {
    translationTimeMs: metadata.translation_time_ms,
    constraintTimeMs: metadata.constraint_time_ms,
    modelVersion: metadata.model_version,
    schemaVersion: metadata.schema_version,
    promptTokens: metadata.prompt_tokens,
    completionTokens: metadata.completion_tokens
  };
}

function formatQueryPlan(plan: any) {
  return {
    operators: plan.operators.map(formatPlanOperator),
    estimatedRows: plan.estimated_rows,
    dbHits: plan.db_hits,
    pageCacheHits: plan.page_cache_hits,
    pageCacheMisses: plan.page_cache_misses
  };
}

function formatPlanOperator(op: any): any {
  return {
    operatorType: op.operator_type,
    estimatedRows: op.estimated_rows,
    dbHits: op.db_hits,
    variables: op.variables,
    details: op.details,
    children: op.children.map(formatPlanOperator)
  };
}

function formatIndexInfo(index: any) {
  return {
    label: index.label,
    properties: index.properties,
    type: index.type.toUpperCase()
  };
}

function formatConstraintInfo(constraint: any) {
  return {
    label: constraint.label,
    properties: constraint.properties,
    type: constraint.type.toUpperCase()
  };
}