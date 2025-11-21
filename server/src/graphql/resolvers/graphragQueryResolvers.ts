/**
 * GraphQL resolvers for GraphRAG Query Preview functionality
 */

import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import type { Driver } from 'neo4j-driver';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger.js';
import { GraphRAGQueryService } from '../../services/GraphRAGQueryService.js';
import { GraphRAGService } from '../../services/GraphRAGService.js';
import { QueryPreviewService } from '../../services/QueryPreviewService.js';
import { GlassBoxRunService } from '../../services/GlassBoxRunService.js';
import { NlToCypherService } from '../../ai/nl-to-cypher/nl-to-cypher.service.js';

export type Context = {
  pool: Pool;
  neo4jDriver: Driver;
  redis?: Redis;
  userId: string;
  tenantId: string;
};

/**
 * Create service instances (usually done in a dependency injection container)
 */
function createServices(context: Context) {
  const glassBoxService = new GlassBoxRunService(context.pool, context.redis);

  const nlToCypherService = new NlToCypherService(
    context.neo4jDriver,
    context.pool
  );

  const queryPreviewService = new QueryPreviewService(
    context.pool,
    context.neo4jDriver,
    nlToCypherService,
    glassBoxService,
    context.redis
  );

  const graphRAGService = new GraphRAGService(
    context.neo4jDriver,
    // LLM service would be injected here
    null as any,
    // Embedding service would be injected here
    null as any,
    context.redis
  );

  const graphRAGQueryService = new GraphRAGQueryService(
    graphRAGService,
    queryPreviewService,
    glassBoxService,
    context.pool,
    context.neo4jDriver
  );

  return {
    graphRAGQueryService,
    queryPreviewService,
    glassBoxService,
  };
}

export const graphragQueryResolvers = {
  Query: {
    /**
     * Execute a GraphRAG query with optional preview
     */
    graphragQuery: async (
      _parent: unknown,
      args: {
        input: {
          investigationId: string;
          question: string;
          focusEntityIds?: string[];
          maxHops?: number;
          generateQueryPreview?: boolean;
          autoExecute?: boolean;
          maxRows?: number;
          timeout?: number;
        };
      },
      context: Context
    ) => {
      const { userId, tenantId } = context;

      if (!userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        const { graphRAGQueryService } = createServices(context);

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

        return response;
      } catch (error) {
        logger.error({ error, args, userId }, 'GraphRAG query failed');
        throw new GraphQLError('Failed to execute GraphRAG query', {
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
    queryPreview: async (
      _parent: unknown,
      args: { id: string },
      context: Context
    ) => {
      const { userId } = context;

      if (!userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        const { queryPreviewService } = createServices(context);
        const preview = await queryPreviewService.getPreview(args.id);

        if (!preview) {
          throw new GraphQLError(`Preview ${args.id} not found`, {
            extensions: { code: 'NOT_FOUND' },
          });
        }

        return preview;
      } catch (error) {
        logger.error({ error, previewId: args.id, userId }, 'Failed to get preview');
        throw error;
      }
    },

    /**
     * Get a glass-box run by ID
     */
    glassBoxRun: async (
      _parent: unknown,
      args: { id: string },
      context: Context
    ) => {
      const { userId } = context;

      if (!userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        const { glassBoxService } = createServices(context);
        const run = await glassBoxService.getRun(args.id);

        if (!run) {
          throw new GraphQLError(`Run ${args.id} not found`, {
            extensions: { code: 'NOT_FOUND' },
          });
        }

        return run;
      } catch (error) {
        logger.error({ error, runId: args.id, userId }, 'Failed to get run');
        throw error;
      }
    },

    /**
     * List runs for an investigation
     */
    glassBoxRuns: async (
      _parent: unknown,
      args: {
        investigationId: string;
        status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
        limit?: number;
        offset?: number;
      },
      context: Context
    ) => {
      const { userId } = context;

      if (!userId) {
        throw new GraphQLError('Authentication required', {
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
      } catch (error) {
        logger.error({
          error,
          investigationId: args.investigationId,
          userId,
        }, 'Failed to list runs');
        throw new GraphQLError('Failed to list runs', {
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
    replayHistory: async (
      _parent: unknown,
      args: { runId: string },
      context: Context
    ) => {
      const { userId } = context;

      if (!userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        const { graphRAGQueryService } = createServices(context);
        const history = await graphRAGQueryService.getReplayHistory(args.runId);

        return history;
      } catch (error) {
        logger.error({ error, runId: args.runId, userId }, 'Failed to get replay history');
        throw new GraphQLError('Failed to get replay history', {
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
    createQueryPreview: async (
      _parent: unknown,
      args: {
        input: {
          investigationId: string;
          question: string;
          language?: 'cypher' | 'sql';
          focusEntityIds?: string[];
          maxHops?: number;
          parameters?: Record<string, unknown>;
        };
      },
      context: Context
    ) => {
      const { userId, tenantId } = context;

      if (!userId) {
        throw new GraphQLError('Authentication required', {
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
      } catch (error) {
        logger.error({ error, args, userId }, 'Failed to create preview');
        throw new GraphQLError('Failed to create query preview', {
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
    editQueryPreview: async (
      _parent: unknown,
      args: {
        previewId: string;
        editedQuery: string;
      },
      context: Context
    ) => {
      const { userId } = context;

      if (!userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        const { queryPreviewService } = createServices(context);

        const preview = await queryPreviewService.editPreview(
          args.previewId,
          userId,
          args.editedQuery
        );

        return preview;
      } catch (error) {
        logger.error({
          error,
          previewId: args.previewId,
          userId,
        }, 'Failed to edit preview');
        throw new GraphQLError('Failed to edit query preview', {
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
    executeQueryPreview: async (
      _parent: unknown,
      args: {
        input: {
          previewId: string;
          useEditedQuery?: boolean;
          dryRun?: boolean;
          maxRows?: number;
          timeout?: number;
        };
      },
      context: Context
    ) => {
      const { userId } = context;

      if (!userId) {
        throw new GraphQLError('Authentication required', {
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
        });

        return response;
      } catch (error) {
        logger.error({
          error,
          previewId: args.input.previewId,
          userId,
        }, 'Failed to execute preview');
        throw new GraphQLError('Failed to execute query preview', {
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
    replayRun: async (
      _parent: unknown,
      args: {
        input: {
          runId: string;
          modifiedQuestion?: string;
          modifiedParameters?: Record<string, unknown>;
          skipCache?: boolean;
        };
      },
      context: Context
    ) => {
      const { userId } = context;

      if (!userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        const { graphRAGQueryService } = createServices(context);

        const response = await graphRAGQueryService.replayRun(
          args.input.runId,
          userId,
          {
            modifiedQuestion: args.input.modifiedQuestion,
            modifiedParameters: args.input.modifiedParameters,
            skipCache: args.input.skipCache,
          }
        );

        return response;
      } catch (error) {
        logger.error({
          error,
          runId: args.input.runId,
          userId,
        }, 'Failed to replay run');
        throw new GraphQLError('Failed to replay run', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : String(error),
          },
        });
      }
    },
  },
};
