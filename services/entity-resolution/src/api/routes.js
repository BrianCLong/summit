"use strict";
/**
 * Entity Resolution Service - HTTP API Routes
 *
 * RESTful endpoints for entity resolution operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiRouter = createApiRouter;
// @ts-nocheck
const express_1 = __importDefault(require("express"));
/**
 * Create API router
 */
function createApiRouter(erService) {
    const router = express_1.default.Router();
    /**
     * POST /er/compare
     * Compare two entity records
     */
    router.post('/compare', async (req, res) => {
        try {
            const { recordA, recordB } = req.body;
            if (!recordA || !recordB) {
                return res.status(400).json({
                    error: 'Missing required fields: recordA, recordB',
                });
            }
            const decision = await erService.compare(recordA, recordB);
            return res.status(200).json(decision);
        }
        catch (error) {
            return res.status(500).json({
                error: 'Failed to compare records',
                message: error.message,
            });
        }
    });
    /**
     * POST /er/batch-candidates
     * Find candidate matches for a batch of records
     */
    router.post('/batch-candidates', async (req, res) => {
        try {
            const { records, maxCandidatesPerRecord } = req.body;
            if (!records || !Array.isArray(records)) {
                return res.status(400).json({
                    error: 'Missing or invalid required field: records (must be array)',
                });
            }
            const result = await erService.batchCandidates(records, maxCandidatesPerRecord || 10);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({
                error: 'Failed to find candidate matches',
                message: error.message,
            });
        }
    });
    /**
     * POST /er/merge
     * Merge two entity records
     */
    router.post('/merge', async (req, res) => {
        try {
            const { primaryId, secondaryId, reason, decisionId } = req.body;
            if (!primaryId || !secondaryId || !reason) {
                return res.status(400).json({
                    error: 'Missing required fields: primaryId, secondaryId, reason',
                });
            }
            // TODO: Extract user ID from auth context
            const triggeredBy = req.headers['x-user-id']?.toString() || 'anonymous';
            const mergedEntity = await erService.merge(primaryId, secondaryId, triggeredBy, reason, decisionId);
            return res.status(200).json(mergedEntity);
        }
        catch (error) {
            return res.status(500).json({
                error: 'Failed to merge records',
                message: error.message,
            });
        }
    });
    /**
     * POST /er/split
     * Undo a merge operation
     */
    router.post('/split', async (req, res) => {
        try {
            const { mergeId, reason } = req.body;
            if (!mergeId || !reason) {
                return res.status(400).json({
                    error: 'Missing required fields: mergeId, reason',
                });
            }
            // TODO: Extract user ID from auth context
            const triggeredBy = req.headers['x-user-id']?.toString() || 'anonymous';
            await erService.split(mergeId, reason, triggeredBy);
            return res.status(200).json({
                message: 'Merge operation split successfully',
                mergeId,
            });
        }
        catch (error) {
            return res.status(500).json({
                error: 'Failed to split merge',
                message: error.message,
            });
        }
    });
    /**
     * GET /er/decisions/:id
     * Get a match decision by ID
     */
    router.get('/decisions/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const decision = await erService.getDecision(id);
            if (!decision) {
                return res.status(404).json({
                    error: 'Decision not found',
                });
            }
            return res.status(200).json(decision);
        }
        catch (error) {
            return res.status(500).json({
                error: 'Failed to fetch decision',
                message: error.message,
            });
        }
    });
    /**
     * GET /er/merge-history/:recordId
     * Get merge history for a record
     */
    router.get('/merge-history/:recordId', async (req, res) => {
        try {
            const { recordId } = req.params;
            const history = await erService.getMergeHistory(recordId);
            return res.status(200).json({
                recordId,
                history,
            });
        }
        catch (error) {
            return res.status(500).json({
                error: 'Failed to fetch merge history',
                message: error.message,
            });
        }
    });
    /**
     * GET /health
     * Health check endpoint
     */
    router.get('/health', (req, res) => {
        return res.status(200).json({
            status: 'healthy',
            service: 'entity-resolution',
            timestamp: new Date().toISOString(),
        });
    });
    return router;
}
