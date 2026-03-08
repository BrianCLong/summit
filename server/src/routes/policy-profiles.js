"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const PolicyProfileService_js_1 = require("../services/PolicyProfileService.js");
const PolicyProfileAssignmentService_js_1 = require("../services/policy-profiles/PolicyProfileAssignmentService.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
const assignProfileSchema = zod_1.z.object({
    profileId: zod_1.z.string().min(1),
    tenantId: zod_1.z.string().optional(),
    source: zod_1.z.string().optional(),
});
/**
 * @route GET /api/policy-profiles
 * @desc List available policy profiles
 * @access Protected
 */
router.get('/', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const profiles = PolicyProfileService_js_1.policyProfileService.getProfiles();
        res.json({
            success: true,
            data: profiles,
        });
    }
    catch (error) {
        logger_js_1.default.error('Error in GET /api/policy-profiles:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
        });
    }
});
/**
 * @route POST /api/policy-profiles/assign
 * @desc Assign a policy profile to a tenant and emit a receipt
 * @access Protected
 */
router.post('/assign', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const parseResult = assignProfileSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({
                success: false,
                error: 'Validation Error',
                details: parseResult.error.errors,
            });
            return;
        }
        const user = req.user;
        const tenantId = parseResult.data.tenantId ||
            req.headers['x-tenant-id'] ||
            user?.tenantId ||
            'default-tenant';
        const result = await PolicyProfileAssignmentService_js_1.policyProfileAssignmentService.assignProfile({
            tenantId,
            profileId: parseResult.data.profileId,
            actorId: user?.id || 'system',
            actorType: 'user',
            source: parseResult.data.source || 'api:policy-profiles:assign',
        });
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        logger_js_1.default.error('Error in POST /api/policy-profiles/assign:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
        });
    }
});
exports.default = router;
