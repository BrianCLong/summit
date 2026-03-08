"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const ThreatModelingService_js_1 = require("../services/ThreatModelingService.js");
const auth_js_1 = require("../middleware/auth.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const router = express_1.default.Router();
// Input validation schema
const ThreatModelRequestSchema = zod_1.z.object({
    serviceName: zod_1.z.string().min(1),
    description: zod_1.z.string().min(10),
    architecture: zod_1.z.string().min(10),
    dataFlow: zod_1.z.string().min(10),
});
/**
 * @route POST /api/security/threat-model
 * @desc Generate a STRIDE threat model for a service
 * @access Private
 */
router.post('/threat-model', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const inputs = ThreatModelRequestSchema.parse(req.body);
        const threatModel = await ThreatModelingService_js_1.threatModelingService.generateThreatModel(inputs, req.user?.id, req.user?.tenantId);
        res.json(threatModel);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Validation Error', details: error.errors });
        }
        else {
            logger_js_1.default.error('Error generating threat model', { error: error.message });
            res.status(500).json({ error: 'Internal Server Error', message: error.message });
        }
    }
});
exports.default = router;
