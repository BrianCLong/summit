/**
 * Search Controller
 * Handles metadata search operations
 */

import { Request, Response } from 'express';
import {
  MetadataSearchService,
  DataSourceService,
  SchemaRegistryService,
  SearchEntityType,
} from '@intelgraph/data-catalog';

export class SearchController {
  private searchService: MetadataSearchService;
  private dataSourceService: DataSourceService;

  constructor() {
    this.dataSourceService = new DataSourceService();
    const schemaRegistryService = new SchemaRegistryService();

    // Initialize search service with data stores
    // In production, these would be injected or pulled from a shared registry
    this.searchService = new MetadataSearchService(
      new Map(), // dataSources
      new Map(), // datasets
      new Map(), // fields
      new Map(), // mappings
      new Map(), // schemas
    );
  }

  /**
   * Quick search
   * GET /api/v1/search
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const { q, type, offset = 0, limit = 20 } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          error: 'Query parameter "q" is required',
        });
        return;
      }

      const filters: any = {};
      if (type) {
        filters.entityTypes = [type as SearchEntityType];
      }

      const searchRequest = {
        query: q,
        filters,
        offset: Number(offset),
        limit: Number(limit),
      };

      const result = await this.searchService.search(searchRequest);

      res.json({
        success: true,
        query: q,
        ...result,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Advanced search
   * POST /api/v1/search/advanced
   */
  async advancedSearch(req: Request, res: Response): Promise<void> {
    try {
      const {
        query,
        filters,
        sort,
        offset = 0,
        limit = 20,
        includeArchived = false,
      } = req.body;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          error: 'Query is required',
        });
        return;
      }

      const searchRequest = {
        query,
        filters,
        sort,
        offset,
        limit,
        includeArchived,
      };

      const result = await this.searchService.search(searchRequest);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Advanced search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get search suggestions (autocomplete)
   * GET /api/v1/search/suggestions
   */
  async getSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { q, type, limit = 5 } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          error: 'Query parameter "q" is required',
        });
        return;
      }

      const filters: any = {};
      if (type) {
        filters.entityTypes = [type as SearchEntityType];
      }

      const searchRequest = {
        query: q,
        filters,
        offset: 0,
        limit: Number(limit),
      };

      const result = await this.searchService.search(searchRequest);

      const suggestions = result.results.map((r) => ({
        id: r.entityId,
        type: r.entityType,
        name: r.name,
        displayName: r.displayName,
        description: r.description,
      }));

      res.json({
        success: true,
        query: q,
        suggestions,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get suggestions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Record search click (for analytics)
   * POST /api/v1/search/click
   */
  async recordClick(req: Request, res: Response): Promise<void> {
    try {
      const { query, resultId, resultType, position } = req.body;

      // In production, this would record to analytics
      // For now, just acknowledge
      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        error: 'Failed to record click',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Search fields with advanced filters
   * POST /api/v1/search/fields
   */
  async searchFields(req: Request, res: Response): Promise<void> {
    try {
      const {
        query,
        datasetId,
        dataType,
        canonicalFieldId,
        hasMappings,
        offset = 0,
        limit = 20,
      } = req.body;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          error: 'Query is required',
        });
        return;
      }

      const searchRequest = {
        query,
        datasetId,
        dataType,
        canonicalFieldId,
        hasMappings,
        offset,
        limit,
      };

      const results = await this.searchService.searchFieldsAdvanced(
        searchRequest,
      );

      res.json({
        success: true,
        results,
        total: results.length,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Field search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Perform impact analysis
   * POST /api/v1/search/impact
   */
  async performImpactAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { entityId, entityType, depth = 3 } = req.body;

      if (!entityId || !entityType) {
        res.status(400).json({
          error: 'entityId and entityType are required',
        });
        return;
      }

      const result = await this.searchService.performImpactAnalysis({
        entityId,
        entityType,
        depth,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Impact analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
