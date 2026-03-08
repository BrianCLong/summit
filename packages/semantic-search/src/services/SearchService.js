"use strict";
/**
 * Search Service
 * Provides semantic search, faceted filtering, and relevance ranking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const data_catalog_1 = require("@intelgraph/data-catalog");
class SearchService {
    index;
    analytics;
    constructor(index, analytics) {
        this.index = index;
        this.analytics = analytics;
    }
    /**
     * Search assets
     */
    async search(request, userId) {
        const startTime = Date.now();
        // Execute search
        const response = await this.index.search(request);
        // Calculate time taken
        response.took = Date.now() - startTime;
        // Record analytics
        if (this.analytics && userId) {
            await this.analytics.recordSearch(request.query, userId, response.total);
        }
        return response;
    }
    /**
     * Search with suggestions
     */
    async searchWithSuggestions(query, userId) {
        const request = {
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
    async facetedSearch(query, selectedFacets, userId) {
        const filters = this.buildFiltersFromFacets(selectedFacets);
        const request = {
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
    async advancedSearch(query, filters, sort = [], offset = 0, limit = 20, userId) {
        const searchFilters = this.buildFilters(filters);
        const request = {
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
    async indexAsset(asset) {
        await this.index.indexAsset(asset);
    }
    /**
     * Update indexed asset
     */
    async updateAsset(asset) {
        await this.index.updateAsset(asset);
    }
    /**
     * Delete asset from index
     */
    async deleteAsset(assetId) {
        await this.index.deleteAsset(assetId);
    }
    /**
     * Get search suggestions
     */
    async generateSuggestions(query) {
        // Simple suggestion implementation
        // In production, use a proper suggestion engine or ML model
        const suggestions = [];
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
    async recordClick(query, assetId, position, userId) {
        if (this.analytics) {
            await this.analytics.recordClick(query, assetId, position, userId);
        }
    }
    /**
     * Build filters from facet selections
     */
    buildFiltersFromFacets(selectedFacets) {
        const filters = [];
        for (const [field, values] of Object.entries(selectedFacets)) {
            if (values.length > 0) {
                filters.push({
                    field,
                    operator: data_catalog_1.FilterOperator.IN,
                    value: values,
                });
            }
        }
        return filters;
    }
    /**
     * Build filters from advanced search criteria
     */
    buildFilters(criteria) {
        const filters = [];
        for (const [field, value] of Object.entries(criteria)) {
            if (value === null || value === undefined) {
                continue;
            }
            if (Array.isArray(value)) {
                filters.push({
                    field,
                    operator: data_catalog_1.FilterOperator.IN,
                    value,
                });
            }
            else if (typeof value === 'object' && 'operator' in value) {
                filters.push({
                    field,
                    operator: value.operator,
                    value: value.value,
                });
            }
            else {
                filters.push({
                    field,
                    operator: data_catalog_1.FilterOperator.EQUALS,
                    value,
                });
            }
        }
        return filters;
    }
}
exports.SearchService = SearchService;
