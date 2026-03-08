"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const MeteringService_js_1 = require("../services/billing/MeteringService.js");
const auth_js_1 = require("../middleware/auth.js");
const zod_1 = require("zod");
const router = express_1.default.Router();
// Validation schema for date range
const previewSchema = zod_1.z.object({
    start: zod_1.z.string().datetime(),
    end: zod_1.z.string().datetime()
});
/**
 * GET /api/billing/usage/preview
 * Returns a usage preview for the current tenant.
 */
router.get('/usage/preview', auth_js_1.ensureAuthenticated, async (req, res, next) => {
    try {
        const { start, end } = previewSchema.parse(req.query);
        const tenantId = req.user.tenantId;
        if (!tenantId) {
            res.status(401).json({ error: 'Tenant context required' });
            return;
        }
        const preview = await MeteringService_js_1.meteringService.getUsagePreview(tenantId, new Date(start), new Date(end));
        res.json(preview);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
