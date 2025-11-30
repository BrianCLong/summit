/**
 * Schema Registry Controller
 * Handles schema registration, versioning, and compatibility
 */

import { Request, Response } from 'express';
import {
  SchemaRegistryService,
  SchemaRegistrationRequestSchema,
  SchemaEvolutionRequestSchema,
  SchemaSearchRequestSchema,
} from '@intelgraph/data-catalog';

export class SchemaRegistryController {
  private schemaRegistryService: SchemaRegistryService;

  constructor() {
    this.schemaRegistryService = new SchemaRegistryService();
  }

  /**
   * Register a new schema
   * POST /api/v1/catalog/schemas
   */
  async registerSchema(req: Request, res: Response): Promise<void> {
    try {
      const validation = SchemaRegistrationRequestSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      const schema = await this.schemaRegistryService.registerSchema(
        req.body,
      );

      res.status(201).json({
        success: true,
        schema,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to register schema',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get schema by ID
   * GET /api/v1/catalog/schemas/:id
   */
  async getSchema(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const schema = await this.schemaRegistryService.getSchema(id);

      if (!schema) {
        res.status(404).json({
          error: 'Schema not found',
        });
        return;
      }

      res.json({
        success: true,
        schema,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get schema',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get schema by name and namespace
   * GET /api/v1/catalog/schemas/:namespace/:name
   */
  async getSchemaByName(req: Request, res: Response): Promise<void> {
    try {
      const { namespace, name } = req.params;
      const { version } = req.query;

      const schema = await this.schemaRegistryService.getSchemaByName(
        namespace,
        name,
        version as string | undefined,
      );

      if (!schema) {
        res.status(404).json({
          error: 'Schema not found',
        });
        return;
      }

      res.json({
        success: true,
        schema,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get schema',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Search schemas
   * POST /api/v1/catalog/schemas/search
   */
  async searchSchemas(req: Request, res: Response): Promise<void> {
    try {
      const validation = SchemaSearchRequestSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      const result = await this.schemaRegistryService.searchSchemas(req.body);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to search schemas',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Evolve schema (create new version)
   * POST /api/v1/catalog/schemas/:id/evolve
   */
  async evolveSchema(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const evolutionRequest = {
        ...req.body,
        schemaId: id,
      };

      const validation = SchemaEvolutionRequestSchema.safeParse(
        evolutionRequest,
      );
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
        return;
      }

      const newSchema = await this.schemaRegistryService.evolveSchema(
        evolutionRequest,
      );

      res.status(201).json({
        success: true,
        schema: newSchema,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to evolve schema',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Deprecate schema
   * POST /api/v1/catalog/schemas/:id/deprecate
   */
  async deprecateSchema(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason, replacementSchemaId } = req.body;

      if (!reason) {
        res.status(400).json({
          error: 'Deprecation reason is required',
        });
        return;
      }

      const schema = await this.schemaRegistryService.deprecateSchema(
        id,
        reason,
        replacementSchemaId,
      );

      res.json({
        success: true,
        schema,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to deprecate schema',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Archive schema
   * POST /api/v1/catalog/schemas/:id/archive
   */
  async archiveSchema(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const schema = await this.schemaRegistryService.archiveSchema(id);

      res.json({
        success: true,
        schema,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to archive schema',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get schema versions
   * GET /api/v1/catalog/schemas/:id/versions
   */
  async getSchemaVersions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const versions = await this.schemaRegistryService.getSchemaVersions(id);

      res.json({
        success: true,
        versions,
        total: versions.length,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get schema versions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get schema usage statistics
   * GET /api/v1/catalog/schemas/:id/usage
   */
  async getSchemaUsage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const usage = await this.schemaRegistryService.getSchemaUsage(id);

      res.json({
        success: true,
        usage,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get schema usage',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
