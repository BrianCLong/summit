"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const MasintService_js_1 = require("../services/MasintService.js");
const masint_types_js_1 = require("../types/masint.types.js");
const auth_js_1 = require("../middleware/auth.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const http_param_js_1 = require("../utils/http-param.js");
const router = express_1.default.Router();
const masintService = MasintService_js_1.MasintService.getInstance();
/**
 * @route POST /api/masint/ingest
 * @desc Ingest a raw MASINT signal for analysis
 * @access Private
 */
router.post('/ingest', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const validation = masint_types_js_1.MasintSignalSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid signal format',
                details: validation.error.format()
            });
        }
        const result = await masintService.processSignal(validation.data);
        res.status(200).json(result);
    }
    catch (error) {
        logger_js_1.default.error('Error processing MASINT signal:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
/**
 * @route GET /api/masint/analysis/:id
 * @desc Retrieve analysis result for a specific signal
 * @access Private
 */
router.get('/analysis/:id', auth_js_1.ensureAuthenticated, async (req, res) => {
    const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
    try {
        const result = await masintService.getAnalysis(id);
        if (!result) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        res.json(result);
    }
    catch (error) {
        logger_js_1.default.error({ error, id }, 'Error retrieving analysis');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;
