"use strict";
/**
 * Explainability Explorer API Routes
 *
 * Read-only endpoints for querying explainability artifacts.
 * Implements: docs/explainability/EXPLAINABILITY_CONTRACT.md
 *
 * Security:
 * - All endpoints are read-only (no mutations)
 * - Enforces RBAC and tenant isolation
 * - Admin-only for cross-tenant views
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ExplainabilityExplorerService_js_1 = require("../explainability/ExplainabilityExplorerService.js");
const http_param_js_1 = require("../utils/http-param.js");
const router = (0, express_1.Router)();
const service = ExplainabilityExplorerService_js_1.ExplainabilityExplorerService.getInstance();
/**
 * GET /api/explainability/runs
 *
 * List runs with filtering and pagination.
 * Query params:
 *   - run_type: filter by type
 *   - actor_id: filter by actor
 *   - started_after: ISO 8601 timestamp
 *   - started_before: ISO 8601 timestamp
 *   - capability: filter by capability used
 *   - min_confidence: minimum confidence threshold
 *   - limit: pagination limit (default 50)
 *   - offset: pagination offset (default 0)
 */
router.get('/runs', async (req, res) => {
    try {
        // Extract tenant from request (assumes middleware sets req.tenant)
        const tenantId = req.tenant?.id || req.user?.tenantId;
        const requesterId = req.user?.id || 'anonymous';
        if (!tenantId) {
            return res.status(403).json({
                success: false,
                data: null,
                errors: [
                    {
                        code: 'TENANT_REQUIRED',
                        message: 'Tenant context required for this operation',
                    },
                ],
            });
        }
        const filter = {
            run_type: (0, http_param_js_1.firstString)(req.query.run_type),
            actor_id: (0, http_param_js_1.firstString)(req.query.actor_id),
            started_after: (0, http_param_js_1.firstString)(req.query.started_after),
            started_before: (0, http_param_js_1.firstString)(req.query.started_before),
            capability: (0, http_param_js_1.firstString)(req.query.capability),
            min_confidence: (0, http_param_js_1.firstString)(req.query.min_confidence)
                ? parseFloat((0, http_param_js_1.firstStringOr)(req.query.min_confidence, '0'))
                : undefined,
            limit: (0, http_param_js_1.firstString)(req.query.limit) ? parseInt((0, http_param_js_1.firstStringOr)(req.query.limit, '50'), 10) : 50,
            offset: (0, http_param_js_1.firstString)(req.query.offset) ? parseInt((0, http_param_js_1.firstStringOr)(req.query.offset, '0'), 10) : 0,
        };
        const result = await service.listRuns(tenantId, filter, requesterId);
        return res.status(result.success ? 200 : 500).json(result);
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            data: null,
            errors: [
                {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            ],
        });
    }
});
/**
 * GET /api/explainability/runs/:runId
 *
 * Fetch a single run by ID.
 * Returns full explanation with links to artifacts, SBOM, and provenance.
 */
router.get('/runs/:runId', async (req, res) => {
    try {
        const runId = (0, http_param_js_1.firstStringOr)(req.params.runId, '');
        const tenantId = req.tenant?.id || req.user?.tenantId;
        const requesterId = req.user?.id || 'anonymous';
        if (!tenantId) {
            return res.status(403).json({
                success: false,
                data: null,
                errors: [
                    {
                        code: 'TENANT_REQUIRED',
                        message: 'Tenant context required for this operation',
                    },
                ],
            });
        }
        const result = await service.getRun(runId, tenantId, requesterId);
        return res.status(result.success ? 200 : 404).json(result);
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            data: null,
            errors: [
                {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            ],
        });
    }
});
/**
 * GET /api/explainability/runs/:runId/lineage
 *
 * Traverse lineage: run → artifacts → SBOM → provenance.
 * Query params:
 *   - depth: how many levels to traverse (default 3)
 */
router.get('/runs/:runId/lineage', async (req, res) => {
    try {
        const runId = (0, http_param_js_1.firstStringOr)(req.params.runId, '');
        const tenantId = req.tenant?.id || req.user?.tenantId;
        const depth = (0, http_param_js_1.firstString)(req.query.depth)
            ? parseInt((0, http_param_js_1.firstStringOr)(req.query.depth, '3'), 10)
            : 3;
        if (!tenantId) {
            return res.status(403).json({
                success: false,
                data: null,
                errors: [
                    {
                        code: 'TENANT_REQUIRED',
                        message: 'Tenant context required for this operation',
                    },
                ],
            });
        }
        const result = await service.getLineage(runId, tenantId, depth);
        return res.status(result.success ? 200 : 500).json(result);
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            data: null,
            errors: [
                {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            ],
        });
    }
});
/**
 * GET /api/explainability/compare
 *
 * Compare two runs: inputs/outputs/confidence deltas.
 * Query params:
 *   - run_a: first run ID
 *   - run_b: second run ID
 */
router.get('/compare', async (req, res) => {
    try {
        const runA = (0, http_param_js_1.firstString)(req.query.run_a);
        const runB = (0, http_param_js_1.firstString)(req.query.run_b);
        const tenantId = req.tenant?.id || req.user?.tenantId;
        if (!runA || !runB) {
            return res.status(400).json({
                success: false,
                data: null,
                errors: [
                    {
                        code: 'INVALID_PARAMS',
                        message: 'Both run_a and run_b query parameters are required',
                    },
                ],
            });
        }
        if (!tenantId) {
            return res.status(403).json({
                success: false,
                data: null,
                errors: [
                    {
                        code: 'TENANT_REQUIRED',
                        message: 'Tenant context required for this operation',
                    },
                ],
            });
        }
        const result = await service.compareRuns(runA, runB, tenantId);
        return res.status(result.success ? 200 : 404).json(result);
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            data: null,
            errors: [
                {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            ],
        });
    }
});
/**
 * GET /api/explainability/runs/:runId/verify
 *
 * Verify linkage: run → provenance → SBOM hashes.
 * Returns verification report.
 */
router.get('/runs/:runId/verify', async (req, res) => {
    try {
        const runId = (0, http_param_js_1.firstStringOr)(req.params.runId, '');
        const tenantId = req.tenant?.id || req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({
                success: false,
                data: null,
                errors: [
                    {
                        code: 'TENANT_REQUIRED',
                        message: 'Tenant context required for this operation',
                    },
                ],
            });
        }
        const result = await service.verifyLinkage(runId, tenantId);
        return res.status(result.success ? 200 : 500).json(result);
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            data: null,
            errors: [
                {
                    code: 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            ],
        });
    }
});
/**
 * Health check endpoint.
 */
router.get('/health', async (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'explainability-explorer',
        version: '1.0.0',
        readonly: true,
    });
});
exports.default = router;
