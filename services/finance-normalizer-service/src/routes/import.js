"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const NormalizationService_js_1 = require("../services/NormalizationService.js");
const finance_normalizer_types_1 = require("@intelgraph/finance-normalizer-types");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const audit_js_1 = require("../middleware/audit.js");
const index_js_1 = require("../parsers/index.js");
exports.importRoutes = (0, express_1.Router)();
/**
 * GET /api/v1/import/formats
 * List supported import formats
 */
exports.importRoutes.get('/formats', (_req, res) => {
    res.json({
        formats: (0, index_js_1.getSupportedFormats)(),
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
exports.importRoutes.post('/ledger', (0, audit_js_1.auditMiddleware)('IMPORT_LEDGER', 'ImportJob'), async (req, res, next) => {
    try {
        const input = finance_normalizer_types_1.importLedgerInputSchema.parse(req.body);
        const job = await NormalizationService_js_1.normalizationService.startImportJob(input, req.tenantId, req.userId || 'system');
        res.status(202).json({
            jobId: job.id,
            status: job.status,
            message: input.dryRun
                ? 'Validation completed'
                : 'Import job started',
            job,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/import/jobs
 * List import jobs
 */
exports.importRoutes.get('/jobs', async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = parseInt(req.query.offset) || 0;
        const result = await NormalizationService_js_1.normalizationService.listImportJobs(req.tenantId, limit, offset);
        res.json({
            jobs: result.jobs,
            total: result.total,
            limit,
            offset,
            hasMore: offset + result.jobs.length < result.total,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/import/jobs/:id
 * Get import job status
 */
exports.importRoutes.get('/jobs/:id', async (req, res, next) => {
    try {
        const job = await NormalizationService_js_1.normalizationService.getImportJob(req.params.id, req.tenantId);
        if (!job) {
            throw new errorHandler_js_1.NotFoundError('ImportJob', req.params.id);
        }
        res.json(job);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/import/normalize
 * Normalize a single transaction (for streaming)
 */
exports.importRoutes.post('/normalize', (0, audit_js_1.auditMiddleware)('NORMALIZE_TRANSACTION', 'Transaction'), async (req, res, next) => {
    try {
        const input = finance_normalizer_types_1.normalizeTransactionInputSchema.parse(req.body);
        const transaction = await NormalizationService_js_1.normalizationService.normalizeTransaction(input.rawData, input.format, input.parserConfig, req.tenantId);
        res.json({
            success: true,
            transaction,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/import/validate
 * Validate data without importing
 */
exports.importRoutes.post('/validate', async (req, res, next) => {
    try {
        const schema = zod_1.z.object({
            data: zod_1.z.string(),
            format: zod_1.z.string().optional(),
            parserConfig: zod_1.z.record(zod_1.z.unknown()).optional(),
        });
        const input = schema.parse(req.body);
        const result = await NormalizationService_js_1.normalizationService.validateData(Buffer.from(input.data, 'base64').toString('utf8'), input.format, input.parserConfig);
        res.json({
            valid: result.errors.length === 0,
            format: result.format,
            totalRecords: result.totalRecords,
            validRecords: result.records.length,
            errors: result.errors,
            warnings: result.records.flatMap((r) => r.warnings),
            metadata: result.metadata,
        });
    }
    catch (error) {
        next(error);
    }
});
