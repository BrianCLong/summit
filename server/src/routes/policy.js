"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyRouter = void 0;
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const tenantBundle_js_1 = require("../policy/tenantBundle.js");
const profiles_js_1 = require("../policy/profiles.js");
const PolicyProfileAssignmentService_js_1 = require("../services/policy-profiles/PolicyProfileAssignmentService.js");
const profile_manifests_js_1 = require("../policies/profile-manifests.js");
const auth_js_1 = require("../middleware/auth.js");
const hotReloadService_js_1 = require("../policy/hotReloadService.js");
// Named export for compatibility (reverted from default)
exports.policyRouter = express_1.default.Router();
// POST /policies/rollback - Rollback policy bundle version (Sprint 08)
exports.policyRouter.post('/rollback', auth_js_1.ensureAuthenticated, (0, auth_js_1.ensureRole)(['ADMIN', 'admin']), async (req, res) => {
    try {
        const { versionId } = req.body;
        if (!versionId) {
            return res.status(400).json({ error: 'versionId required' });
        }
        const version = await hotReloadService_js_1.policyHotReloadService.rollback(versionId);
        res.json({
            success: true,
            versionId: version.versionId,
            digest: version.digest,
            message: 'Policy rolled back successfully'
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Rollback failed', message: error.message });
    }
});
exports.policyRouter.post('/simulate', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const input = tenantBundle_js_1.policySimulationInputSchema.parse(req.body);
        const context = req.body.context ? tenantBundle_js_1.overlayContextSchema.parse(req.body.context) : undefined;
        const tenantId = req.headers['x-tenant-id'] ||
            req.user?.tenantId ||
            'default-tenant';
        const activeProfile = await PolicyProfileAssignmentService_js_1.policyProfileAssignmentService.getActiveProfile(tenantId);
        // Check if the request specifies a template/profile
        let bundle = activeProfile.bundle;
        const requestedProfile = req.body.profile;
        if (requestedProfile) {
            const manifest = (0, profile_manifests_js_1.getPolicyProfileManifest)(requestedProfile);
            if (manifest) {
                bundle = (0, profile_manifests_js_1.buildTenantPolicyBundle)(tenantId, requestedProfile, 'policy-simulation:override');
            }
            else if (requestedProfile === 'balanced') {
                bundle = profiles_js_1.Profiles.balanced;
            }
            else if (requestedProfile === 'fast_ops') {
                bundle = profiles_js_1.Profiles.fast_ops;
            }
            else if (requestedProfile === 'strict') {
                bundle = profiles_js_1.Profiles.strict;
            }
        }
        const result = (0, tenantBundle_js_1.simulatePolicyDecision)(bundle, input, context);
        res.json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
