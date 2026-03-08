"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const EventService_js_1 = require("../../events/EventService.js");
const unifiedAuth_js_1 = require("../../middleware/unifiedAuth.js");
const rbac_js_1 = require("../../middleware/rbac.js");
const router = express_1.default.Router();
// POST /tenants/{id}/integrations/events/sinks
router.post('/tenants/:tenantId/integrations/events/sinks', unifiedAuth_js_1.requireAuth, (0, rbac_js_1.requireRole)('admin'), async (req, res) => {
    try {
        const { tenantId } = req.params;
        // Verify user belongs to tenant or is super admin
        if (req.user?.tenantId !== tenantId) { // simplified check
            return res.status(403).json({ error: 'Unauthorized' });
        }
        await EventService_js_1.eventService.createSink({
            ...req.body,
            tenant_id: tenantId
        });
        res.status(201).json({ message: 'Sink created' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /events/replay (Policy gated)
router.post('/events/replay', unifiedAuth_js_1.requireAuth, (0, rbac_js_1.requireRole)('admin'), async (req, res) => {
    try {
        const receipt = await EventService_js_1.eventService.replay({
            tenantId: req.user.tenantId,
            startTime: new Date(req.body.startTime),
            endTime: new Date(req.body.endTime),
            eventTypes: req.body.eventTypes,
            sinkIds: req.body.sinkIds
        }, req.user.id);
        res.json({ message: 'Replay initiated', receipt });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
