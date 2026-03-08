"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ticket_links_js_1 = require("../services/ticket-links.js");
const router = express_1.default.Router();
/** GET /api/tickets/:provider/:externalId/links */
router.get('/tickets/:provider/:externalId/links', async (req, res) => {
    const { provider, externalId } = req.params;
    const links = await (0, ticket_links_js_1.getTicketLinks)({ provider, externalId });
    res.json(links);
});
/** POST /api/tickets/:provider/:externalId/link-run { runId } */
router.post('/tickets/:provider/:externalId/link-run', express_1.default.json(), async (req, res) => {
    const { provider, externalId } = req.params;
    const { runId } = (req.body || {});
    if (!runId)
        return res.status(400).json({ error: 'runId required' });
    await (0, ticket_links_js_1.linkTicketToRun)({ provider, externalId, runId });
    res.json({ ok: true });
});
/** POST /api/tickets/:provider/:externalId/link-deployment { deploymentId } */
router.post('/tickets/:provider/:externalId/link-deployment', express_1.default.json(), async (req, res) => {
    const { provider, externalId } = req.params;
    const { deploymentId } = (req.body || {});
    if (!deploymentId)
        return res.status(400).json({ error: 'deploymentId required' });
    await (0, ticket_links_js_1.linkTicketToDeployment)({ provider, externalId, deploymentId });
    res.json({ ok: true });
});
exports.default = router;
