"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const QueryPreviewService_js_1 = require("../services/QueryPreviewService.js");
const previewStreamHub_js_1 = require("../services/previewStreamHub.js");
const database_js_1 = require("../config/database.js");
const nl_to_cypher_service_js_1 = require("../ai/nl-to-cypher/nl-to-cypher.service.js");
const GlassBoxRunService_js_1 = require("../services/GlassBoxRunService.js");
const logger_js_1 = require("../utils/logger.js");
const router = express_1.default.Router();
let previewService = null;
function getPreviewService() {
    if (previewService) {
        return previewService;
    }
    const pool = (0, database_js_1.getPostgresPool)();
    const neo4jDriver = (0, database_js_1.getNeo4jDriver)();
    const redis = (0, database_js_1.getRedisClient)() ?? undefined;
    const nlToCypherService = new nl_to_cypher_service_js_1.NlToCypherService({
        generate: async () => 'MATCH (n) RETURN n LIMIT 10',
    });
    const glassBoxService = new GlassBoxRunService_js_1.GlassBoxRunService(pool, redis);
    previewService = new QueryPreviewService_js_1.QueryPreviewService(pool, neo4jDriver, nlToCypherService, glassBoxService, redis);
    return previewService;
}
router.get('/query-previews/:id/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const previewId = req.params.id;
    const parsedBatchSize = Number(req.query.batchSize ?? NaN);
    const batchSize = Number.isFinite(parsedBatchSize) && parsedBatchSize > 0 ? parsedBatchSize : undefined;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
    const autoStart = req.query.autostart !== 'false';
    const useEditedQuery = req.query.useEdited === 'true';
    const userId = req.user?.id ?? 'stream-subscriber';
    let service;
    try {
        service = getPreviewService();
    }
    catch (error) {
        logger_js_1.logger.error({ error }, 'Failed to initialise query preview stream service');
        res.write(`event: error\ndata:${JSON.stringify({ message: 'Unable to initialise streaming service' })}\n\n`);
        res.end();
        return;
    }
    const unsubscribe = previewStreamHub_js_1.previewStreamHub.subscribe(previewId, (payload) => {
        res.write(`data:${JSON.stringify(payload)}\n\n`);
        if (payload.complete) {
            res.write('event: complete\n\n');
        }
    });
    req.on('close', () => {
        unsubscribe();
    });
    try {
        const cached = await service.getStreamingPartial(previewId, useEditedQuery);
        if (cached?.rows?.length) {
            res.write(`event: warm-start\ndata:${JSON.stringify({
                previewId,
                batch: cached.rows,
                cursor,
                cacheTier: cached.tier,
            })}\n\n`);
        }
    }
    catch (error) {
        logger_js_1.logger.warn({ error, previewId }, 'Failed to load streaming cache warm start');
    }
    if (autoStart) {
        void service
            .executePreview({
            previewId,
            userId,
            useEditedQuery,
            cursor,
            batchSize,
            stream: true,
        })
            .catch((error) => {
            logger_js_1.logger.error({ error, previewId }, 'Streaming execution failed');
            res.write(`event: error\ndata:${JSON.stringify({
                message: error instanceof Error ? error.message : String(error),
            })}\n\n`);
            res.end();
        });
    }
});
exports.default = router;
