"use strict";
// @ts-nocheck
/**
 * GraphQL Resolvers for AI Copilot MVP
 *
 * Implements the "Auditable by Design" copilot with:
 * - Natural language to Cypher translation
 * - Query preview and approval flow
 * - Hypothesis generation
 * - Narrative building
 * - Full audit trail
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.copilotMVPResolvers = void 0;
const graphql_1 = require("graphql");
const pino_1 = __importDefault(require("pino"));
const NLToCypherService_js_1 = require("../services/NLToCypherService.js");
const llm_guardrails_js_1 = require("../security/llm-guardrails.js");
const crypto_1 = require("crypto");
const logger = pino_1.default({ name: 'CopilotMVPResolvers' });
exports.copilotMVPResolvers = {
    Query: {
        /**
         * Preview NL query - generates Cypher with cost estimate
         */
        previewNLQuery: async (_, { input }, context) => {
            try {
                const { neo4jDriver, llmService } = context.dataSources;
                const nlToCypherService = (0, NLToCypherService_js_1.getNLToCypherService)(llmService, llm_guardrails_js_1.llmGuardrails, neo4jDriver);
                const result = await nlToCypherService.translateQuery({
                    query: input.query,
                    investigationId: input.investigationId,
                    userId: input.userId || context.user?.id,
                    dryRun: true, // Always dry run for preview
                });
                logger.info({
                    investigationId: input.investigationId,
                    userId: input.userId,
                    allowed: result.allowed,
                    complexity: result.complexity,
                    estimatedRows: result.estimatedRows,
                }, 'NL query preview generated');
                return result;
            }
            catch (error) {
                logger.error({ error, input }, 'Failed to preview NL query');
                throw new graphql_1.GraphQLError('Failed to generate query preview', {
                    extensions: {
                        code: 'PREVIEW_GENERATION_FAILED',
                        originalError: error instanceof Error ? error.message : 'Unknown error',
                    },
                });
            }
        },
        /**
         * Execute NL query - translates and runs in one step (with approval)
         */
        executeNLQuery: async (_, { input }, context) => {
            try {
                const { neo4jDriver, llmService } = context.dataSources;
                const nlToCypherService = (0, NLToCypherService_js_1.getNLToCypherService)(llmService, llm_guardrails_js_1.llmGuardrails, neo4jDriver);
                // First, generate and validate
                const preview = await nlToCypherService.translateQuery({
                    query: input.query,
                    investigationId: input.investigationId,
                    userId: input.userId || context.user?.id,
                    dryRun: true,
                });
                if (!preview.allowed) {
                    throw new graphql_1.GraphQLError(preview.blockReason || 'Query not allowed', {
                        extensions: {
                            code: 'QUERY_BLOCKED',
                            blockReason: preview.blockReason,
                            warnings: preview.warnings,
                        },
                    });
                }
                // Execute the validated query
                const executionResult = await nlToCypherService.executeQuery(preview.cypher, input.investigationId, preview.auditId);
                // Extract entity IDs from results for citations
                const citations = extractCitations(executionResult.records);
                logger.info({
                    investigationId: input.investigationId,
                    userId: input.userId,
                    recordCount: executionResult.summary.recordCount,
                    auditId: preview.auditId,
                }, 'NL query executed successfully');
                return {
                    records: executionResult.records,
                    summary: executionResult.summary,
                    citations,
                    auditId: preview.auditId,
                };
            }
            catch (error) {
                logger.error({ error, input }, 'Failed to execute NL query');
                if (error instanceof graphql_1.GraphQLError) {
                    throw error;
                }
                throw new graphql_1.GraphQLError('Failed to execute query', {
                    extensions: {
                        code: 'QUERY_EXECUTION_FAILED',
                        originalError: error instanceof Error ? error.message : 'Unknown error',
                    },
                });
            }
        },
        /**
         * Generate hypotheses based on graph state
         */
        generateHypotheses: async (_, { input }, context) => {
            try {
                const { llmService, graphRAGService } = context.dataSources;
                // Get graph context
                const graphRAGAnswer = await graphRAGService.answer({
                    investigationId: input.investigationId,
                    question: 'What are the most significant patterns and anomalies in this investigation?',
                    focusEntityIds: input.focusEntityIds,
                    maxHops: 2,
                });
                // Generate hypotheses using LLM
                const prompt = `You are an intelligence analyst assistant. Based on the following investigation data, generate ${input.count || 3} plausible hypotheses that could explain the observed patterns.

INVESTIGATION CONTEXT:
${graphRAGAnswer.answer}

ENTITY CITATIONS:
${graphRAGAnswer.citations.entityIds.join(', ')}

Generate ${input.count || 3} hypotheses in JSON format:
[
  {
    "statement": "hypothesis statement",
    "confidence": 0.75,
    "supportingEvidence": [
      {
        "type": "pattern",
        "description": "evidence description",
        "strength": 0.8,
        "sourceIds": ["entity1", "entity2"]
      }
    ],
    "involvedEntities": ["entity1", "entity2"],
    "suggestedSteps": ["investigation step 1", "investigation step 2"]
  }
]`;
                const response = await llmService.complete({
                    prompt,
                    maxTokens: 1500,
                    temperature: 0.3,
                    responseFormat: 'json',
                });
                const hypotheses = JSON.parse(response);
                // Add IDs and format
                const formattedHypotheses = hypotheses.map((h) => ({
                    id: (0, crypto_1.randomUUID)(),
                    ...h,
                    supportingEvidence: h.supportingEvidence.map((e) => ({
                        id: (0, crypto_1.randomUUID)(),
                        ...e,
                    })),
                }));
                logger.info({
                    investigationId: input.investigationId,
                    hypothesesCount: formattedHypotheses.length,
                }, 'Hypotheses generated');
                return formattedHypotheses;
            }
            catch (error) {
                logger.error({ error, input }, 'Failed to generate hypotheses');
                throw new graphql_1.GraphQLError('Failed to generate hypotheses', {
                    extensions: {
                        code: 'HYPOTHESIS_GENERATION_FAILED',
                        originalError: error instanceof Error ? error.message : 'Unknown error',
                    },
                });
            }
        },
        /**
         * Generate narrative report
         */
        generateNarrative: async (_, { input }, context) => {
            try {
                const { llmService, graphRAGService } = context.dataSources;
                // Get comprehensive graph context
                const graphRAGAnswer = await graphRAGService.answer({
                    investigationId: input.investigationId,
                    question: input.theme || 'Provide a comprehensive overview of this investigation',
                    focusEntityIds: input.keyEntityIds,
                    maxHops: 2,
                });
                // Generate narrative based on style
                const stylePrompts = {
                    ANALYTICAL: 'analytical intelligence report with findings and recommendations',
                    CHRONOLOGICAL: 'chronological timeline narrative showing how events unfolded',
                    NETWORK_FOCUSED: 'network-centric narrative focusing on connections and relationships',
                    THREAT_ASSESSMENT: 'threat assessment narrative evaluating risks and vulnerabilities',
                };
                const stylePrompt = stylePrompts[input.style] || stylePrompts.ANALYTICAL;
                const prompt = `You are an intelligence analyst. Write a ${stylePrompt} in markdown format.

INVESTIGATION CONTEXT:
${graphRAGAnswer.answer}

CONFIDENCE: ${graphRAGAnswer.confidence}

Requirements:
- Use markdown formatting (headers, lists, bold, italic)
- Include 3-5 key findings
- Reference specific entities by name
- Maintain professional intelligence analysis tone
- Be concise but comprehensive (500-800 words)

Generate a JSON response:
{
  "title": "narrative title",
  "content": "full markdown narrative",
  "keyFindings": ["finding 1", "finding 2", "finding 3"]
}`;
                const response = await llmService.complete({
                    prompt,
                    maxTokens: 2000,
                    temperature: 0.2,
                    responseFormat: 'json',
                });
                const narrativeData = JSON.parse(response);
                const narrative = {
                    id: (0, crypto_1.randomUUID)(),
                    investigationId: input.investigationId,
                    title: narrativeData.title,
                    content: narrativeData.content,
                    keyFindings: narrativeData.keyFindings,
                    citations: graphRAGAnswer.citations.entityIds,
                    supportingPaths: graphRAGAnswer.why_paths,
                    confidence: graphRAGAnswer.confidence,
                    createdAt: new Date().toISOString(),
                    auditId: (0, crypto_1.randomUUID)(),
                };
                logger.info({
                    investigationId: input.investigationId,
                    narrativeLength: narrative.content.length,
                    confidence: narrative.confidence,
                }, 'Narrative generated');
                return narrative;
            }
            catch (error) {
                logger.error({ error, input }, 'Failed to generate narrative');
                throw new graphql_1.GraphQLError('Failed to generate narrative', {
                    extensions: {
                        code: 'NARRATIVE_GENERATION_FAILED',
                        originalError: error instanceof Error ? error.message : 'Unknown error',
                    },
                });
            }
        },
        /**
         * Get copilot suggestions
         */
        copilotSuggestions: async (_, { investigationId }, context) => {
            try {
                // Return smart suggestions based on investigation state
                return [
                    'Show me all high-confidence entities connected to persons of interest',
                    'Find unusual patterns in communication timestamps',
                    'What are the most central entities in this network?',
                    'Identify entities with conflicting information',
                    'Show me entities added in the last 7 days',
                ];
            }
            catch (error) {
                logger.error({ error, investigationId }, 'Failed to get suggestions');
                return [];
            }
        },
    },
    Mutation: {
        /**
         * Execute pre-approved Cypher query
         */
        executeCypherQuery: async (_, { cypher, investigationId, auditId }, context) => {
            try {
                const { neo4jDriver, llmService } = context.dataSources;
                const nlToCypherService = (0, NLToCypherService_js_1.getNLToCypherService)(llmService, llm_guardrails_js_1.llmGuardrails, neo4jDriver);
                const executionResult = await nlToCypherService.executeQuery(cypher, investigationId, auditId);
                const citations = extractCitations(executionResult.records);
                logger.info({
                    investigationId,
                    auditId,
                    recordCount: executionResult.summary.recordCount,
                }, 'Cypher query executed via mutation');
                return {
                    records: executionResult.records,
                    summary: executionResult.summary,
                    citations,
                    auditId: auditId || (0, crypto_1.randomUUID)(),
                };
            }
            catch (error) {
                logger.error({ error, cypher, investigationId }, 'Failed to execute Cypher');
                throw new graphql_1.GraphQLError('Failed to execute query', {
                    extensions: {
                        code: 'EXECUTION_FAILED',
                        originalError: error instanceof Error ? error.message : 'Unknown error',
                    },
                });
            }
        },
        /**
         * Save hypothesis
         */
        saveHypothesis: async (_, { investigationId, hypothesis, confidence }, context) => {
            // TODO: Persist to database
            return {
                id: (0, crypto_1.randomUUID)(),
                statement: hypothesis,
                confidence,
                supportingEvidence: [],
                involvedEntities: [],
                suggestedSteps: [],
            };
        },
        /**
         * Save narrative
         */
        saveNarrative: async (_, { investigationId, title, content }, context) => {
            // TODO: Persist to database
            return {
                id: (0, crypto_1.randomUUID)(),
                investigationId,
                title,
                content,
                keyFindings: [],
                citations: [],
                supportingPaths: [],
                confidence: 0.8,
                createdAt: new Date().toISOString(),
                auditId: (0, crypto_1.randomUUID)(),
            };
        },
    },
};
/**
 * Helper: Extract entity IDs from query results
 */
function extractCitations(records) {
    const entityIds = new Set();
    for (const record of records) {
        for (const value of Object.values(record)) {
            if (value && typeof value === 'object') {
                if ('id' in value && 'type' in value) {
                    // Looks like an entity
                    entityIds.add(String(value.id));
                }
            }
        }
    }
    return Array.from(entityIds);
}
exports.default = exports.copilotMVPResolvers;
