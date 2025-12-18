import { Router, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { TenantRequest } from '../middleware/tenant.js';
import { normalizationService } from '../services/NormalizationService.js';
import { importLedgerInputSchema, normalizeTransactionInputSchema } from '@intelgraph/finance-normalizer-types';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { auditMiddleware } from '../middleware/audit.js';
import { getSupportedFormats } from '../parsers/index.js';

export const importRoutes = Router();

/**
 * GET /api/v1/import/formats
 * List supported import formats
 */
importRoutes.get('/formats', (_req, res: Response) => {
  res.json({
    formats: getSupportedFormats(),
    descriptions: {
      CSV: 'Comma-separated values with configurable columns',
      SWIFT_MT940: 'SWIFT MT940 bank statement format',
      SWIFT_MT942: 'SWIFT MT942 interim transaction report',
      SWIFT_MT103: 'SWIFT MT103 single customer credit transfer',
      JSON: 'Generic JSON format from bank APIs',
      CUSTOM: 'Custom format with user-defined parser configuration',
    },
  });
});

/**
 * POST /api/v1/import/ledger
 * Start a new ledger import job
 */
importRoutes.post(
  '/ledger',
  auditMiddleware('IMPORT_LEDGER', 'ImportJob'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const input = importLedgerInputSchema.parse(req.body);

      const job = await normalizationService.startImportJob(
        input,
        req.tenantId,
        req.userId || 'system'
      );

      res.status(202).json({
        jobId: job.id,
        status: job.status,
        message: input.dryRun
          ? 'Validation completed'
          : 'Import job started',
        job,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/import/jobs
 * List import jobs
 */
importRoutes.get(
  '/jobs',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await normalizationService.listImportJobs(
        req.tenantId,
        limit,
        offset
      );

      res.json({
        jobs: result.jobs,
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.jobs.length < result.total,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/import/jobs/:id
 * Get import job status
 */
importRoutes.get(
  '/jobs/:id',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const job = await normalizationService.getImportJob(
        req.params.id,
        req.tenantId
      );

      if (!job) {
        throw new NotFoundError('ImportJob', req.params.id);
      }

      res.json(job);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/import/normalize
 * Normalize a single transaction (for streaming)
 */
importRoutes.post(
  '/normalize',
  auditMiddleware('NORMALIZE_TRANSACTION', 'Transaction'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const input = normalizeTransactionInputSchema.parse(req.body);

      const transaction = await normalizationService.normalizeTransaction(
        input.rawData,
        input.format,
        input.parserConfig,
        req.tenantId
      );

      res.json({
        success: true,
        transaction,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/import/validate
 * Validate data without importing
 */
importRoutes.post(
  '/validate',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        data: z.string(),
        format: z.string().optional(),
        parserConfig: z.record(z.unknown()).optional(),
      });

      const input = schema.parse(req.body);

      const result = await normalizationService.validateData(
        Buffer.from(input.data, 'base64').toString('utf8'),
        input.format as any,
        input.parserConfig
      );

      res.json({
        valid: result.errors.length === 0,
        format: result.format,
        totalRecords: result.totalRecords,
        validRecords: result.records.length,
        errors: result.errors,
        warnings: result.records.flatMap((r) => r.warnings),
        metadata: result.metadata,
      });
    } catch (error) {
      next(error);
    }
  }
);
