"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const PipelineSmokeService_js_1 = require("../services/PipelineSmokeService.js");
const auth_js_1 = require("../middleware/auth.js");
const rbac_js_1 = require("../middleware/rbac.js");
const router = express_1.default.Router();
router.use(express_1.default.json());
router.use(auth_js_1.ensureAuthenticated);
/**
 * Trigger a smoke test manually.
 * Requires admin permission.
 */
router.post('/admin/smoke-test', (0, rbac_js_1.requirePermission)('admin:access'), async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenant || 'default';
        const pipelineId = req.body.pipelineId || 'smoke-test-pipeline';
        const timeoutMs = req.body.timeoutMs || 60000;
        const result = await PipelineSmokeService_js_1.pipelineSmokeService.runSmokeTest(tenantId, pipelineId, timeoutMs);
        if (result.success) {
            res.json(result);
        }
        else {
            res.status(500).json(result);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
exports.default = router;
