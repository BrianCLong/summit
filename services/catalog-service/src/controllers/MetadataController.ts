/**
 * Metadata Controller
 * Handles data source, dataset, field, mapping, and license operations
 */

import { Request, Response } from 'express';
import { MetadataService } from '@intelgraph/data-catalog';
import { MetadataSearchService } from '@intelgraph/data-catalog';

export class MetadataController {
  constructor(
    private metadataService: MetadataService,
    private searchService: MetadataSearchService
  ) {}

  // ====== DataSource Operations ======

  async listDataSources(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.searchService.searchDataSources({
        limit: parseInt(req.query.limit as string) || 20,
        offset: parseInt(req.query.offset as string) || 0,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getDataSource(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.metadataService.getDataSourceWithDatasets(id);

      if (!result) {
        res.status(404).json({ error: 'Data source not found' });
        return;
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async registerDataSource(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = await this.metadataService.registerDataSource(req.body);
      res.status(201).json(dataSource);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async updateDataSourceStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, lastConnectedAt } = req.body;

      const dataSource = await this.metadataService.updateDataSourceStatus(
        id,
        status,
        lastConnectedAt ? new Date(lastConnectedAt) : undefined
      );

      res.json(dataSource);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  // ====== Dataset Operations ======

  async listDatasets(req: Request, res: Response): Promise<void> {
    try {
      const sourceId = req.query.sourceId as string | undefined;
      const licenseId = req.query.licenseId as string | undefined;
      const policyTags = req.query.policyTags
        ? (req.query.policyTags as string).split(',')
        : undefined;
      const tags = req.query.tags
        ? (req.query.tags as string).split(',')
        : undefined;

      const datasets = await this.metadataService.searchDatasets({
        sourceId,
        licenseId,
        policyTags,
        tags,
      });

      res.json({
        datasets,
        total: datasets.length,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getDataset(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dataset = await this.metadataService.store.getDataset(id);

      if (!dataset) {
        res.status(404).json({ error: 'Dataset not found' });
        return;
      }

      res.json(dataset);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async registerDataset(req: Request, res: Response): Promise<void> {
    try {
      const { dataset, fields } = req.body;

      const createdDataset = fields
        ? await this.metadataService.registerDatasetWithFields(dataset, fields)
        : await this.metadataService.registerDataset(dataset);

      res.status(201).json(createdDataset);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async updateDatasetStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const stats = req.body;

      const dataset = await this.metadataService.updateDatasetStatistics(id, stats);
      res.json(dataset);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async searchDatasets(req: Request, res: Response): Promise<void> {
    try {
      const query = {
        query: req.query.q as string,
        filters: req.query.filters ? JSON.parse(req.query.filters as string) : [],
        sort: req.query.sort ? JSON.parse(req.query.sort as string) : [],
        limit: parseInt(req.query.limit as string) || 20,
        offset: parseInt(req.query.offset as string) || 0,
      };

      const result = await this.searchService.searchDatasets(query);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  // ====== Field Operations ======

  async searchFields(req: Request, res: Response): Promise<void> {
    try {
      const query = {
        query: req.query.q as string,
        filters: req.query.filters ? JSON.parse(req.query.filters as string) : [],
        sort: req.query.sort ? JSON.parse(req.query.sort as string) : [],
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0,
      };

      const result = await this.searchService.searchFields(query);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async searchFieldsByCanonicalName(req: Request, res: Response): Promise<void> {
    try {
      const { canonicalName } = req.params;
      const fields = await this.searchService.searchFieldsByCanonicalName(canonicalName);

      res.json({
        canonicalName,
        fields,
        total: fields.length,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  // ====== Mapping Operations ======

  async listMappings(req: Request, res: Response): Promise<void> {
    try {
      const sourceId = req.query.sourceId as string | undefined;
      const mappings = await this.metadataService.store.listMappings(sourceId);

      res.json({
        mappings,
        total: mappings.length,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getMapping(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const mapping = await this.metadataService.store.getMapping(id);

      if (!mapping) {
        res.status(404).json({ error: 'Mapping not found' });
        return;
      }

      res.json(mapping);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async createMapping(req: Request, res: Response): Promise<void> {
    try {
      const mapping = await this.metadataService.createMapping(req.body);
      res.status(201).json(mapping);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async validateMapping(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { validatedBy } = req.body;

      const mapping = await this.metadataService.validateMapping(id, validatedBy);
      res.json(mapping);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async getMappingImpact(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const datasets = await this.metadataService.findDatasetsAffectedByMapping(id);

      res.json({
        mappingId: id,
        affectedDatasets: datasets,
        totalAffected: datasets.length,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  // ====== License Operations ======

  async listLicenses(req: Request, res: Response): Promise<void> {
    try {
      const licenses = await this.metadataService.getActiveLicenses();

      res.json({
        licenses,
        total: licenses.length,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getLicense(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const license = await this.metadataService.store.getLicense(id);

      if (!license) {
        res.status(404).json({ error: 'License not found' });
        return;
      }

      res.json(license);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async createLicense(req: Request, res: Response): Promise<void> {
    try {
      const license = await this.metadataService.createLicense(req.body);
      res.status(201).json(license);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async getLicenseUsage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const datasets = await this.metadataService.getDatasetsWithLicense(id);

      res.json({
        licenseId: id,
        datasets,
        totalDatasets: datasets.length,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  // ====== Universal Search ======

  async universalSearch(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!query) {
        res.status(400).json({ error: 'Query parameter "q" is required' });
        return;
      }

      const results = await this.searchService.universalSearch(query, limit);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  // ====== Lineage & Impact Analysis ======

  async getDatasetImpact(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const impact = await this.metadataService.getDatasetImpact(id);

      res.json({
        datasetId: id,
        ...impact,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}
