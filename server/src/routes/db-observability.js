"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDbObservabilityRouter = buildDbObservabilityRouter;
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const auth_js_1 = require("../middleware/auth.js");
const RateLimiter_js_1 = require("../services/RateLimiter.js");
const db_observability_js_1 = require("../observability/db-observability.js");
const limiterWindowMs = 60_000;
const limiterMaxRequests = 5;
const SnapshotRequestSchema = zod_1.z.object({
    explain: zod_1.z
        .object({
        queryId: zod_1.z.string(),
        parameters: zod_1.z.record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.number()])).optional(),
    })
        .optional(),
});
function buildDbObservabilityRouter(service = new db_observability_js_1.DbObservabilityService()) {
    const router = express_1.default.Router();
    router.use(express_1.default.json());
    router.use(auth_js_1.ensureAuthenticated);
    router.use((0, auth_js_1.ensureRole)('admin'));
    router.post('/snapshot', async (req, res, next) => {
        try {
            const limiterKey = `dbobs:${req.user?.id || req.ip}`;
            const limitResult = await RateLimiter_js_1.rateLimiter.consume(limiterKey, 1, limiterMaxRequests, limiterWindowMs);
            res.set('X-DbObservability-Limit', String(limitResult.total));
            res.set('X-DbObservability-Remaining', String(limitResult.remaining));
            res.set('X-DbObservability-Reset', String(Math.ceil(limitResult.reset / 1000)));
            if (!limitResult.allowed) {
                res.status(429).json({
                    error: 'Too many DB observability requests, please pause before retrying',
                    retryAfterSeconds: Math.ceil((limitResult.reset - Date.now()) / 1000),
                });
                return;
            }
            const parsed = SnapshotRequestSchema.parse(req.body ?? {});
            const snapshot = await service.snapshot(parsed.explain ? { explain: parsed.explain } : {}, {
                userId: req.user?.id || req.user?.sub,
                tenantId: req.user?.tenantId,
                correlationId: req.correlationId || req.headers['x-correlation-id'],
                requestId: req.id,
            });
            res.json({
                feature: 'DB_OBSERVABILITY_V2',
                data: snapshot,
            });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
exports.default = buildDbObservabilityRouter();
