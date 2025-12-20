/**
 * Data Source Controller
 * Handles data source and dataset operations
 */

import { Request, Response } from 'express';
import {
  DataSourceService,
  DataSourceSchema,
  DatasetSchema,
  FieldSchema,
  ConnectionStatus,
} from '@intelgraph/data-catalog';

export class DataSourceController {
  private dataSourceService: DataSourceService;

  constructor() {
    this.dataSourceService = new DataSourceService();
  }

  /**
   * Register a new data source
   * POST /api/v1/catalog/sources
   */
  async registerSource(req: Request, res: Response): Promise<void> {
    try {
      const validation = DataSourceSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      const dataSource = await this.dataSourceService.registerDataSource(
        req.body,
      );

      res.status(201).json({
        success: true,
        dataSource,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to register data source',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get data source by ID
   * GET /api/v1/catalog/sources/:id
   */
  async getSource(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dataSource = await this.dataSourceService.getDataSource(id);

      if (!dataSource) {
        res.status(404).json({
          error: 'Data source not found',
        });
        return;
      }

      res.json({
        success: true,
        dataSource,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get data source',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * List all data sources
   * GET /api/v1/catalog/sources
   */
  async listSources(req: Request, res: Response): Promise<void> {
    try {
      const { type, status, tags, domain } = req.query;

      const filters: any = {};
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];
      if (domain) filters.domain = domain;

      const dataSources = await this.dataSourceService.listDataSources(
        filters,
      );

      res.json({
        success: true,
        dataSources,
        total: dataSources.length,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to list data sources',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Test data source connection
   * POST /api/v1/catalog/sources/:id/test
   */
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.dataSourceService.testConnection(id);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Connection test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Register a new dataset
   * POST /api/v1/catalog/datasets
   */
  async registerDataset(req: Request, res: Response): Promise<void> {
    try {
      const validation = DatasetSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      const dataset = await this.dataSourceService.registerDataset(req.body);

      res.status(201).json({
        success: true,
        dataset,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to register dataset',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get dataset by ID
   * GET /api/v1/catalog/datasets/:id
   */
  async getDataset(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dataset = await this.dataSourceService.getDataset(id);

      if (!dataset) {
        res.status(404).json({
          error: 'Dataset not found',
        });
        return;
      }

      res.json({
        success: true,
        dataset,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get dataset',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * List datasets
   * GET /api/v1/catalog/datasets
   */
  async listDatasets(req: Request, res: Response): Promise<void> {
    try {
      const { sourceId, status, tags, domain } = req.query;

      const filters: any = {};
      if (sourceId) filters.sourceId = sourceId as string;
      if (status) filters.status = status;
      if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];
      if (domain) filters.domain = domain;

      const datasets = await this.dataSourceService.listDatasets(filters);

      res.json({
        success: true,
        datasets,
        total: datasets.length,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to list datasets',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Search datasets
   * GET /api/v1/catalog/datasets/search
   */
  async searchDatasets(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          error: 'Query parameter "q" is required',
        });
        return;
      }

      const datasets = await this.dataSourceService.searchDatasets(q);

      res.json({
        success: true,
        datasets,
        total: datasets.length,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to search datasets',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Register a field
   * POST /api/v1/catalog/fields
   */
  async registerField(req: Request, res: Response): Promise<void> {
    try {
      const validation = FieldSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      const field = await this.dataSourceService.registerField(req.body);

      res.status(201).json({
        success: true,
        field,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to register field',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * List fields for a dataset
   * GET /api/v1/catalog/datasets/:datasetId/fields
   */
  async listFields(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      const fields = await this.dataSourceService.listFields(datasetId);

      res.json({
        success: true,
        fields,
        total: fields.length,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to list fields',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Search fields
   * GET /api/v1/catalog/fields/search
   */
  async searchFields(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          error: 'Query parameter "q" is required',
        });
        return;
      }

      const fields = await this.dataSourceService.searchFields(q);

      res.json({
        success: true,
        fields,
        total: fields.length,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to search fields',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get impact analysis
   * GET /api/v1/catalog/:entityType/:id/impact
   */
  async getImpactAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, id } = req.params;

      const analysis = await this.dataSourceService.getImpactAnalysis(id);

      res.json({
        success: true,
        entityId: id,
        entityType,
        ...analysis,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get impact analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get lineage for an entity
   * GET /api/v1/catalog/:entityType/:id/lineage
   */
  async getLineage(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, id } = req.params;

      const lineage = await this.dataSourceService.getLineage(id);

      if (!lineage) {
        res.status(404).json({
          error: 'Lineage not found',
        });
        return;
      }

      res.json({
        success: true,
        lineage,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get lineage',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Attach license to dataset
   * POST /api/v1/catalog/datasets/:datasetId/licenses/:licenseId
   */
  async attachLicense(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId, licenseId } = req.params;

      await this.dataSourceService.attachLicenseToDataset(
        datasetId,
        licenseId,
      );

      res.json({
        success: true,
        message: 'License attached successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to attach license',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get datasets by license
   * GET /api/v1/catalog/licenses/:licenseId/datasets
   */
  async getDatasetsByLicense(req: Request, res: Response): Promise<void> {
    try {
      const { licenseId } = req.params;

      const datasets = await this.dataSourceService.getDatasetsByLicense(
        licenseId,
      );

      res.json({
        success: true,
        datasets,
        total: datasets.length,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get datasets by license',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get datasets by policy tag
   * GET /api/v1/catalog/policy-tags/:tag/datasets
   */
  async getDatasetsByPolicyTag(req: Request, res: Response): Promise<void> {
    try {
      const { tag } = req.params;

      const datasets = await this.dataSourceService.getDatasetsByPolicyTag(
        tag,
      );

      res.json({
        success: true,
        datasets,
        total: datasets.length,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get datasets by policy tag',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
