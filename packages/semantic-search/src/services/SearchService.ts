/**
 * Search Service
 * Provides semantic search, faceted filtering, and relevance ranking
 */

import {
  SearchRequest,
  SearchResponse,
  SearchFacet,
  AssetMetadata,
  FilterOperator,
  SearchFilter,
} from '@intelgraph/data-catalog';
import { SemanticHardeningStack } from '../semantic/SemanticHardeningStack.js';

export interface ISearchIndex {
  search(request: SearchRequest): Promise<SearchResponse>;
  indexAsset(asset: AssetMetadata): Promise<void>;
  deleteAsset(assetId: string): Promise<void>;
  updateAsset(asset: AssetMetadata): Promise<void>;
  buildFacets(query: string, facetFields: string[]): Promise<SearchFacet[]>;
}

export interface ISearchAnalytics {
  recordSearch(query: string, userId: string, resultCount: number): Promise<void>;
  recordClick(query: string, assetId: string, position: number, userId: string): Promise<void>;
}

export class SearchService {
  constructor(
    private index: ISearchIndex,
    private analytics?: ISearchAnalytics,
    private hardeningStack?: SemanticHardeningStack
  ) {}

  /**
   * Search assets
   */
  async search(request: SearchRequest, userId?: string): Promise<SearchResponse> {
    const startTime = Date.now();
    const hardenedRequest = this.hardeningStack ? this.hardeningStack.harden(request) : null;

    // Execute search
    const response = await this.index.search(hardenedRequest?.request ?? request);

    // Calculate time taken
    response.took = Date.now() - startTime;

    // Record analytics
    if (this.analytics && userId) {
      await this.analytics.recordSearch(
        hardenedRequest?.request.query ?? request.query,
        userId,
        response.total
      );
    }

    return response;
  }

  /**
   * Search with suggestions
   */
  async searchWithSuggestions(query: string, userId?: string): Promise<{
    results: SearchResponse;
    suggestions: string[];
  }> {
    const request: SearchRequest = {
      query,
      filters: [],
      facets: ['type', 'status', 'domain', 'owner'],
      sort: [{ field: '_score', direction: 'DESC' }],
      offset: 0,
      limit: 20,
    };

    const results = await this.search(request, userId);
    const suggestions = await this.generateSuggestions(query);

    return {
      results,
      suggestions,
    };
  }

  /**
   * Faceted search
   */
  async facetedSearch(
    query: string,
    selectedFacets: Record<string, string[]>,
    userId?: string
  ): Promise<SearchResponse> {
    const filters = this.buildFiltersFromFacets(selectedFacets);

    const request: SearchRequest = {
      query,
      filters,
      facets: ['type', 'status', 'domain', 'owner', 'classification', 'tags'],
      sort: [{ field: '_score', direction: 'DESC' }],
      offset: 0,
      limit: 20,
    };

    return this.search(request, userId);
  }

  /**
   * Advanced search with multiple filters
   */
  async advancedSearch(
    query: string,
    filters: Record<string, unknown>,
    sort: { field: string; direction: 'ASC' | 'DESC' }[] = [],
    offset: number = 0,
    limit: number = 20,
    userId?: string
  ): Promise<SearchResponse> {
    const searchFilters = this.buildFilters(filters);

    const request: SearchRequest = {
      query,
      filters: searchFilters,
      facets: ['type', 'status', 'domain', 'owner', 'classification'],
      sort: sort.length > 0 ? sort : [{ field: '_score', direction: 'DESC' }],
      offset,
      limit,
    };

    return this.search(request, userId);
  }

  /**
   * Index asset for search
   */
  async indexAsset(asset: AssetMetadata): Promise<void> {
    await this.index.indexAsset(asset);
  }

  /**
   * Update indexed asset
   */
  async updateAsset(asset: AssetMetadata): Promise<void> {
    await this.index.updateAsset(asset);
  }

  /**
   * Delete asset from index
   */
  async deleteAsset(assetId: string): Promise<void> {
    await this.index.deleteAsset(assetId);
  }

  /**
   * Get search suggestions
   */
  async generateSuggestions(query: string): Promise<string[]> {
    // Simple suggestion implementation
    // In production, use a proper suggestion engine or ML model
    const suggestions: string[] = [];

    if (query.length < 3) {
      return suggestions;
    }

    // Add common search patterns
    suggestions.push(`${query} database`);
    suggestions.push(`${query} table`);
    suggestions.push(`${query} dashboard`);

    return suggestions.slice(0, 5);
  }

  /**
   * Record search click
   */
  async recordClick(query: string, assetId: string, position: number, userId: string): Promise<void> {
    if (this.analytics) {
      await this.analytics.recordClick(query, assetId, position, userId);
    }
  }

  /**
   * Build filters from facet selections
   */
  private buildFiltersFromFacets(selectedFacets: Record<string, string[]>): SearchFilter[] {
    const filters: SearchFilter[] = [];

    for (const [field, values] of Object.entries(selectedFacets)) {
      if (values.length > 0) {
        filters.push({
          field,
          operator: FilterOperator.IN,
          value: values,
        });
      }
    }

    return filters;
  }

  /**
   * Build filters from advanced search criteria
   */
  private buildFilters(criteria: Record<string, unknown>): SearchFilter[] {
    const filters: SearchFilter[] = [];

    for (const [field, value] of Object.entries(criteria)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        filters.push({
          field,
          operator: FilterOperator.IN,
          value,
        });
      } else if (this.isOperatorFilter(value)) {
        filters.push({
          field,
          operator: value.operator,
          value: value.value,
        });
      } else {
        filters.push({
          field,
          operator: FilterOperator.EQUALS,
          value,
        });
      }
    }

    return filters;
  }

  private isOperatorFilter(value: unknown): value is { operator: FilterOperator; value: unknown } {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as { operator?: unknown; value?: unknown };
    return (
      typeof candidate.operator === 'string' &&
      Object.values(FilterOperator).includes(candidate.operator as FilterOperator)
    );
  }
}
