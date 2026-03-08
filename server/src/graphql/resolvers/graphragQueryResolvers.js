"use strict";
/**
 * GraphQL resolvers for GraphRAG Query Preview functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphragQueryResolvers = void 0;
const graphql_1 = require("graphql");
const logger_js_1 = require("../../utils/logger.js");
const GraphRAGQueryService_js_1 = require("../../services/GraphRAGQueryService.js");
const GraphRAGService_js_1 = require("../../services/GraphRAGService.js");
const QueryPreviewService_js_1 = require("../../services/QueryPreviewService.js");
const GlassBoxRunService_js_1 = require("../../services/GlassBoxRunService.js");
const nl_to_cypher_service_js_1 = require("../../ai/nl-to-cypher/nl-to-cypher.service.js");
const QuotaService_js_1 = require("../../services/QuotaService.js");
const UsageMeteringService_js_1 = require("../../services/UsageMeteringService.js");
/**
 * Create service instances (usually done in a dependency injection container)
 */
function createServices(context) {
    const glassBoxService = new GlassBoxRunService_js_1.GlassBoxRunService(context.pool, context.redis);
    const nlToCypherService = new nl_to_cypher_service_js_1.NlToCypherService(
    // Mock adapter for NlToCypherService since resolver dependencies are outdated
    {
        generate: async () => 'MATCH (n) RETURN n LIMIT 10'
    });
    const queryPreviewService = new QueryPreviewService_js_1.QueryPreviewService(context.pool, context.neo4jDriver, nlToCypherService, glassBoxService, context.redis);
    const graphRAGService = new GraphRAGService_js_1.GraphRAGService(context.neo4jDriver, 
    // LLM service would be injected here
    null, 
    // Embedding service would be injected here
    null, context.redis);
    const graphRAGQueryService = new GraphRAGQueryService_js_1.GraphRAGQueryService(graphRAGService, queryPreviewService, glassBoxService, context.pool, context.neo4jDriver);
    return {
        graphRAGQueryService,
        queryPreviewService,
        glassBoxService,
    };
}
exports.graphragQueryResolvers = {
    Query: {
        /**
         * Execute a GraphRAG query with optional preview
         */
        graphragQuery: async (_parent, args, context) => {
            const { userId, tenantId } = context;
            if (!userId) {
                throw new graphql_1.GraphQLError('Authentication required', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }
            try {
                const { graphRAGQueryService } = createServices(context);
                // Check quota before execution (P1-2 implementation)
                try {
                    await QuotaService_js_1.quotaService.assert({
                        tenantId,
                        dimension: 'graph.queries',
                        quantity: 1,
                    });
                }
                catch (error) {
                    if (error instanceof QuotaService_js_1.QuotaExceededException) {
                        throw new graphql_1.GraphQLError('Quota exceeded', {
                            extensions: {
                                code: 'QUOTA_EXCEEDED',
                                dimension: error.dimension,
                                used: error.used,
                                limit: error.limit,
                            },
                        });
                    }
                    throw error;
                }
                const response = await graphRAGQueryService.query({
                    investigationId: args.input.investigationId,
                    tenantId,
                    userId,
                    question: args.input.question,
                    focusEntityIds: args.input.focusEntityIds,
                    maxHops: args.input.maxHops,
                    generateQueryPreview: args.input.generateQueryPreview,
                    autoExecute: args.input.autoExecute ?? true,
                    maxRows: args.input.maxRows,
                    timeout: args.input.timeout,
                });
                // Record usage for billing/analytics (P1-2 implementation)
                await UsageMeteringService_js_1.usageMeteringService.record({
                    id: '', // Will be auto-generated
                    tenantId,
                    dimension: 'graph.queries',
                    quantity: 1,
                    unit: 'count',
                    source: 'graphrag',
                    metadata: {
                        investigationId: args.input.investigationId,
                        question: args.input.question,
                        maxHops: args.input.maxHops,
                    },
                    occurredAt: new Date().toISOString(),
                    recordedAt: new Date().toISOString(),
                });
                return response;
            }
            catch (error) {
                logger_js_1.logger.error({ error, args, userId }, 'GraphRAG query failed');
                throw new graphql_1.GraphQLError('Failed to execute GraphRAG query', {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        originalError: error instanceof Error ? error.message : String(error),
                    },
                });
            }
        },
        /**
         * Get a query preview by ID
         */
        queryPreview: async (_parent, args, context) => {
            const { userId } = context;
            if (!userId) {
                throw new graphql_1.GraphQLError('Authentication required', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }
            try {
                const { queryPreviewService } = createServices(context);
                const preview = await queryPreviewService.getPreview(args.id);
                if (!preview) {
                    throw new graphql_1.GraphQLError(`Preview ${args.id} not found`, {
                        extensions: { code: 'NOT_FOUND' },
                    });
                }
                return preview;
            }
            catch (error) {
                logger_js_1.logger.error({ error, previewId: args.id, userId }, 'Failed to get preview');
                throw error;
            }
        },
        /**
         * Get a glass-box run by ID
         */
        glassBoxRun: async (_parent, args, context) => {
            const { userId } = context;
            if (!userId) {
                throw new graphql_1.GraphQLError('Authentication required', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }
            try {
                const { glassBoxService } = createServices(context);
                const run = await glassBoxService.getRun(args.id);
                if (!run) {
                    throw new graphql_1.GraphQLError(`Run ${args.id} not found`, {
                        extensions: { code: 'NOT_FOUND' },
                    });
                }
                return run;
            }
            catch (error) {
                logger_js_1.logger.error({ error, runId: args.id, userId }, 'Failed to get run');
                throw error;
            }
        },
        /**
         * List runs for an investigation
         */
        glassBoxRuns: async (_parent, args, context) => {
            const { userId } = context;
            if (!userId) {
                throw new graphql_1.GraphQLError('Authentication required', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }
            try {
                const { graphRAGQueryService } = createServices(context);
                const result = await graphRAGQueryService.listRuns(args.investigationId, {
                    status: args.status,
                    limit: args.limit,
                    offset: args.offset,
                });
                return result;
            }
            catch (error) {
                logger_js_1.logger.error({
                    error,
                    investigationId: args.investigationId,
                    userId,
                }, 'Failed to list runs');
                throw new graphql_1.GraphQLError('Failed to list runs', {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        originalError: error instanceof Error ? error.message : String(error),
                    },
                });
            }
        },
        /**
         * Get replay history for a run
         */
        replayHistory: async (_parent, args, context) => {
            const { userId } = context;
            if (!userId) {
                throw new graphql_1.GraphQLError('Authentication required', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }
            try {
                const { graphRAGQueryService } = createServices(context);
                const history = await graphRAGQueryService.getReplayHistory(args.runId);
                return history;
            }
            catch (error) {
                logger_js_1.logger.error({ error, runId: args.runId, userId }, 'Failed to get replay history');
                throw new graphql_1.GraphQLError('Failed to get replay history', {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        originalError: error instanceof Error ? error.message : String(error),
                    },
                });
            }
        },
    },
    Mutation: {
        /**
         * Create a query preview without executing
         */
        createQueryPreview: async (_parent, args, context) => {
            const { userId, tenantId } = context;
            if (!userId) {
                throw new graphql_1.GraphQLError('Authentication required', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }
            try {
                const { queryPreviewService } = createServices(context);
                const preview = await queryPreviewService.createPreview({
                    investigationId: args.input.investigationId,
                    tenantId,
                    userId,
                    naturalLanguageQuery: args.input.question,
                    language: args.input.language,
                    focusEntityIds: args.input.focusEntityIds,
                    maxHops: args.input.maxHops,
                    parameters: args.input.parameters,
                });
                return preview;
            }
            catch (error) {
                logger_js_1.logger.error({ error, args, userId }, 'Failed to create preview');
                throw new graphql_1.GraphQLError('Failed to create query preview', {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        originalError: error instanceof Error ? error.message : String(error),
                    },
                });
            }
        },
        /**
         * Edit a query preview
         */
        editQueryPreview: async (_parent, args, context) => {
            const { userId } = context;
            if (!userId) {
                throw new graphql_1.GraphQLError('Authentication required', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }
            try {
                const { queryPreviewService } = createServices(context);
                const preview = await queryPreviewService.editPreview(args.previewId, userId, args.editedQuery);
                return preview;
            }
            catch (error) {
                logger_js_1.logger.error({
                    error,
                    previewId: args.previewId,
                    userId,
                }, 'Failed to edit preview');
                throw new graphql_1.GraphQLError('Failed to edit query preview', {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        originalError: error instanceof Error ? error.message : String(error),
                    },
                });
            }
        },
        /**
         * Execute a query preview
         */
        executeQueryPreview: async (_parent, args, context) => {
            const { userId } = context;
            if (!userId) {
                throw new graphql_1.GraphQLError('Authentication required', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }
            try {
                const { graphRAGQueryService } = createServices(context);
                const response = await graphRAGQueryService.executePreview({
                    previewId: args.input.previewId,
                    userId,
                    useEditedQuery: args.input.useEditedQuery,
                    dryRun: args.input.dryRun,
                    maxRows: args.input.maxRows,
                    timeout: args.input.timeout,
                    cursor: args.input.cursor,
                    batchSize: args.input.batchSize,
                    stream: args.input.stream,
                });
                return response;
            }
            catch (error) {
                logger_js_1.logger.error({
                    error,
                    previewId: args.input.previewId,
                    userId,
                }, 'Failed to execute preview');
                throw new graphql_1.GraphQLError('Failed to execute query preview', {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        originalError: error instanceof Error ? error.message : String(error),
                    },
                });
            }
        },
        /**
         * Replay a run with optional modifications
         */
        replayRun: async (_parent, args, context) => {
            const { userId } = context;
            if (!userId) {
                throw new graphql_1.GraphQLError('Authentication required', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }
            try {
                const { graphRAGQueryService } = createServices(context);
                const response = await graphRAGQueryService.replayRun(args.input.runId, userId, {
                    modifiedQuestion: args.input.modifiedQuestion,
                    modifiedParameters: args.input.modifiedParameters,
                    skipCache: args.input.skipCache,
                });
                return response;
            }
            catch (error) {
                logger_js_1.logger.error({
                    error,
                    runId: args.input.runId,
                    userId,
                }, 'Failed to replay run');
                throw new graphql_1.GraphQLError('Failed to replay run', {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        originalError: error instanceof Error ? error.message : String(error),
                    },
                });
            }
        },
    },
};
