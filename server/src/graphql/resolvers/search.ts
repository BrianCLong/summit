import { ElasticsearchService } from '../../../apps/search-engine/src/services/ElasticsearchService';
import { QueryBuilderService } from '../../../apps/search-engine/src/services/QueryBuilderService';
import { SavedSearchService } from '../../../apps/search-engine/src/services/SavedSearchService';
import { SearchAnalyticsService } from '../../../apps/search-engine/src/services/SearchAnalyticsService';
import { IndexingService } from '../../../apps/search-engine/src/services/IndexingService';
import { SearchQuery } from '../../../apps/search-engine/src/types';
import logger from '../../config/logger.js';

const searchLogger = logger.child({ name: 'SearchResolvers' });

// These services should be injected via dependency injection or context
// For now, we'll export them to be initialized in the main server setup
export let elasticsearchService: ElasticsearchService;
export let queryBuilderService: QueryBuilderService;
export let savedSearchService: SavedSearchService;
export let analyticsService: SearchAnalyticsService;
export let indexingService: IndexingService;

export function initializeSearchServices(services: {
  elasticsearch: ElasticsearchService;
  queryBuilder: QueryBuilderService;
  savedSearch: SavedSearchService;
  analytics: SearchAnalyticsService;
  indexing: IndexingService;
}): void {
  elasticsearchService = services.elasticsearch;
  queryBuilderService = services.queryBuilder;
  savedSearchService = services.savedSearch;
  analyticsService = services.analytics;
  indexingService = services.indexing;
}

/**
 * Transform GraphQL search input to internal SearchQuery format
 */
function transformSearchInput(input: any): SearchQuery {
  return {
    query: input.query,
    searchType: input.searchType?.toLowerCase() || 'fulltext',
    filters: input.filters
      ? {
          dateRange: input.filters.dateRange,
          entityTypes: input.filters.entityTypes,
          sources: input.filters.sources,
          tags: input.filters.tags,
          confidence: input.filters.confidence,
          custom: input.filters.custom,
        }
      : undefined,
    sort: input.sort
      ? {
          field: input.sort.field,
          order: input.sort.order?.toLowerCase() || 'desc',
          mode: input.sort.mode?.toLowerCase(),
        }
      : undefined,
    pagination: input.pagination
      ? {
          page: input.pagination.page || 1,
          size: input.pagination.size || 20,
          scroll: input.pagination.scroll,
        }
      : { page: 1, size: 20 },
    boost: input.boost,
    facets: input.facets,
    highlight: input.highlight,
  };
}

export const searchResolvers = {
  Query: {
    /**
     * Main search query
     */
    search: async (_: any, { query }: { query: any }, context: any) => {
      try {
        // Check authorization
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const startTime = Date.now();
        const searchQuery = transformSearchInput(query);

        // Perform search
        const result = await elasticsearchService.search(searchQuery);
        const executionTime = Date.now() - startTime;

        // Track analytics
        const queryId = await analyticsService.trackQuery(
          context.user.id,
          searchQuery,
          result.total.value,
          executionTime,
          true,
          context.sessionId,
        );

        searchLogger.info('Search executed', {
          userId: context.user.id,
          queryId,
          query: searchQuery.query,
          resultCount: result.total.value,
          executionTime,
        });

        return {
          query,
          results: result.results,
          total: result.total,
          took: result.took,
          timedOut: result.timedOut,
          facets: result.facets,
          suggestions: result.suggestions,
          scrollId: result.scrollId,
        };
      } catch (error) {
        searchLogger.error('Search failed', {
          error: error instanceof Error ? error.message : String(error),
          query: query.query,
        });
        throw error;
      }
    },

    /**
     * Autocomplete suggestions
     */
    autocomplete: async (
      _: any,
      { query, limit }: { query: string; limit: number },
      context: any,
    ) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const searchQuery: SearchQuery = {
          query,
          searchType: 'fulltext',
          pagination: { page: 1, size: limit },
          highlight: {
            fields: ['title', 'content', 'description'],
            fragmentSize: 50,
            numberOfFragments: 1,
          },
        };

        const result = await elasticsearchService.search(searchQuery);

        return result.results.map((item) => ({
          text: item.source.title || item.source.name || item.id,
          type: item.type.toUpperCase(),
          score: item.score,
          highlight: item.highlight,
        }));
      } catch (error) {
        searchLogger.error('Autocomplete failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        return [];
      }
    },

    /**
     * Query suggestions based on prefix
     */
    querySuggestions: async (
      _: any,
      { prefix, limit }: { prefix: string; limit: number },
      context: any,
    ) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        return await analyticsService.getQuerySuggestions(prefix, limit);
      } catch (error) {
        searchLogger.error('Query suggestions failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        return [];
      }
    },

    /**
     * Personalized suggestions for current user
     */
    personalizedSuggestions: async (
      _: any,
      { limit }: { limit: number },
      context: any,
    ) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        return await analyticsService.getPersonalizedSuggestions(
          context.user.id,
          limit,
        );
      } catch (error) {
        searchLogger.error('Personalized suggestions failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        return [];
      }
    },

    /**
     * Get a saved search by ID
     */
    savedSearch: async (_: any, { id }: { id: string }, context: any) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        return await savedSearchService.getSavedSearch(id, context.user.id);
      } catch (error) {
        searchLogger.error('Get saved search failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },

    /**
     * List saved searches
     */
    savedSearches: async (
      _: any,
      {
        includePublic,
        tags,
        limit,
        offset,
      }: {
        includePublic: boolean;
        tags?: string[];
        limit: number;
        offset: number;
      },
      context: any,
    ) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const result = await savedSearchService.listSavedSearches(
          context.user.id,
          {
            includePublic,
            tags,
            limit,
            offset,
          },
        );

        return result.searches;
      } catch (error) {
        searchLogger.error('List saved searches failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },

    /**
     * Get search metrics
     */
    searchMetrics: async (
      _: any,
      { startDate, endDate }: { startDate: string; endDate: string },
      context: any,
    ) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        // Check if user has admin/analytics permissions
        // await context.authorize('search:analytics');

        return await analyticsService.getMetrics(
          new Date(startDate),
          new Date(endDate),
        );
      } catch (error) {
        searchLogger.error('Get search metrics failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },

    /**
     * Get search system health
     */
    searchHealth: async (_: any, __: any, context: any) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const health = await elasticsearchService.healthCheck();

        return {
          status: health.status,
          details: health.details,
        };
      } catch (error) {
        searchLogger.error('Search health check failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        return {
          status: 'unhealthy',
          details: {
            error: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },
  },

  Mutation: {
    /**
     * Save a search
     */
    saveSearch: async (
      _: any,
      {
        name,
        description,
        query,
        isPublic,
        tags,
      }: {
        name: string;
        description?: string;
        query: any;
        isPublic: boolean;
        tags: string[];
      },
      context: any,
    ) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const searchQuery = transformSearchInput(query);

        return await savedSearchService.createSavedSearch(
          name,
          description,
          searchQuery,
          context.user.id,
          isPublic,
          tags,
        );
      } catch (error) {
        searchLogger.error('Save search failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },

    /**
     * Update a saved search
     */
    updateSavedSearch: async (
      _: any,
      {
        id,
        name,
        description,
        query,
        isPublic,
        tags,
      }: {
        id: string;
        name?: string;
        description?: string;
        query?: any;
        isPublic?: boolean;
        tags?: string[];
      },
      context: any,
    ) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (query !== undefined) updates.query = transformSearchInput(query);
        if (isPublic !== undefined) updates.isPublic = isPublic;
        if (tags !== undefined) updates.tags = tags;

        return await savedSearchService.updateSavedSearch(
          id,
          updates,
          context.user.id,
        );
      } catch (error) {
        searchLogger.error('Update saved search failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },

    /**
     * Delete a saved search
     */
    deleteSavedSearch: async (
      _: any,
      { id }: { id: string },
      context: any,
    ) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const deleted = await savedSearchService.deleteSavedSearch(
          id,
          context.user.id,
        );

        return deleted;
      } catch (error) {
        searchLogger.error('Delete saved search failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },

    /**
     * Execute a saved search
     */
    executeSavedSearch: async (
      _: any,
      { id }: { id: string },
      context: any,
    ) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const savedSearch = await savedSearchService.executeSavedSearch(
          id,
          context.user.id,
        );

        if (!savedSearch) {
          throw new Error('Saved search not found');
        }

        const startTime = Date.now();
        const result = await elasticsearchService.search(savedSearch.query);
        const executionTime = Date.now() - startTime;

        // Track analytics
        await analyticsService.trackQuery(
          context.user.id,
          savedSearch.query,
          result.total.value,
          executionTime,
          true,
          context.sessionId,
        );

        return {
          query: savedSearch.query,
          results: result.results,
          total: result.total,
          took: result.took,
          timedOut: result.timedOut,
          facets: result.facets,
          suggestions: result.suggestions,
          scrollId: result.scrollId,
        };
      } catch (error) {
        searchLogger.error('Execute saved search failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },

    /**
     * Track search result click
     */
    trackSearchClick: async (
      _: any,
      {
        queryId,
        resultId,
        position,
      }: { queryId: string; resultId: string; position: number },
      context: any,
    ) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        await analyticsService.trackClick(queryId, resultId, position);
        return true;
      } catch (error) {
        searchLogger.error('Track search click failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
    },

    /**
     * Reindex all entities (admin only)
     */
    reindexAll: async (_: any, __: any, context: any) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        // Check admin permission
        // await context.authorize('search:admin');

        searchLogger.info('Starting full reindex', {
          userId: context.user.id,
        });

        await indexingService.performFullSync();

        searchLogger.info('Full reindex completed');
        return true;
      } catch (error) {
        searchLogger.error('Reindex failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  },
};

export default searchResolvers;
