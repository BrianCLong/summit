/**
 * Connector Controller
 * Handles connector registration and schema registry operations
 */

import { Request, Response } from 'express';
import { SchemaRegistryService } from '@intelgraph/data-catalog';
import { IMetadataStore } from '@intelgraph/data-catalog';

export class ConnectorController {
  constructor(
    private metadataStore: IMetadataStore,
    private schemaRegistry: SchemaRegistryService
  ) {}

  // ====== Connector Registry Operations ======

  async listConnectors(req: Request, res: Response): Promise<void> {
    try {
      const connectors = await this.metadataStore.listConnectors();

      const status = req.query.status as string | undefined;
      const sourceType = req.query.sourceType as string | undefined;

      let filtered = connectors;

      if (status) {
        filtered = filtered.filter(c => c.status === status);
      }

      if (sourceType) {
        filtered = filtered.filter(c => c.sourceType === sourceType);
      }

      res.json({
        connectors: filtered,
        total: filtered.length,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getConnector(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const connector = await this.metadataStore.getConnector(id);

      if (!connector) {
        res.status(404).json({ error: 'Connector not found' });
        return;
      }

      res.json(connector);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async registerConnector(req: Request, res: Response): Promise<void> {
    try {
      const connector = {
        ...req.body,
        id: `connector-${req.body.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const registered = await this.metadataStore.registerConnector(connector);
      res.status(201).json(registered);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  // ====== Schema Registry Operations ======

  async registerSchema(req: Request, res: Response): Promise<void> {
    try {
      const { schemaId, schema, format, description, changelog, checkCompatibility } = req.body;
      const createdBy = req.headers['x-user-id'] as string || 'system';

      const schemaVersion = await this.schemaRegistry.registerSchemaVersion(
        schemaId,
        schema,
        format,
        createdBy,
        {
          description,
          changelog,
          checkCompatibility: checkCompatibility !== false,
        }
      );

      res.status(201).json(schemaVersion);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async getLatestSchema(req: Request, res: Response): Promise<void> {
    try {
      const { schemaId } = req.params;
      const schemaVersion = await this.schemaRegistry.getLatest(schemaId);

      if (!schemaVersion) {
        res.status(404).json({ error: 'Schema not found' });
        return;
      }

      res.json(schemaVersion);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getSchemaVersion(req: Request, res: Response): Promise<void> {
    try {
      const { schemaId, version } = req.params;
      const schemaVersion = await this.schemaRegistry.getVersion(
        schemaId,
        parseInt(version)
      );

      if (!schemaVersion) {
        res.status(404).json({ error: 'Schema version not found' });
        return;
      }

      res.json(schemaVersion);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async listSchemaVersions(req: Request, res: Response): Promise<void> {
    try {
      const { schemaId } = req.params;
      const versions = await this.schemaRegistry.listVersions(schemaId);

      res.json({
        schemaId,
        versions,
        total: versions.length,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async checkSchemaCompatibility(req: Request, res: Response): Promise<void> {
    try {
      const { schemaId } = req.params;
      const { schema, format } = req.body;

      const latestVersion = await this.schemaRegistry.getLatest(schemaId);

      if (!latestVersion) {
        res.json({
          compatible: true,
          breakingChanges: [],
          warnings: [],
          message: 'No previous version to compare against',
        });
        return;
      }

      const result = this.schemaRegistry.checkCompatibility(
        latestVersion.schema,
        schema,
        format
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async validateSchema(req: Request, res: Response): Promise<void> {
    try {
      const { schema, format } = req.body;

      const validation = this.schemaRegistry.validateSchema(schema, format);

      if (!validation.valid) {
        res.status(400).json(validation);
        return;
      }

      res.json(validation);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async getSchemaDiff(req: Request, res: Response): Promise<void> {
    try {
      const { schemaId, fromVersion, toVersion } = req.params;

      const fromSchema = await this.schemaRegistry.getVersion(
        schemaId,
        parseInt(fromVersion)
      );
      const toSchema = await this.schemaRegistry.getVersion(
        schemaId,
        parseInt(toVersion)
      );

      if (!fromSchema || !toSchema) {
        res.status(404).json({ error: 'Schema version(s) not found' });
        return;
      }

      const diff = this.schemaRegistry.getSchemaDiff(
        fromSchema.schema,
        toSchema.schema,
        fromSchema.schemaFormat
      );

      res.json({
        schemaId,
        fromVersion: parseInt(fromVersion),
        toVersion: parseInt(toVersion),
        diff,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}
