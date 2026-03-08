"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gtmRouter = void 0;
const express_1 = require("express");
const gtm_messaging_service_js_1 = require("../gtm/gtm-messaging-service.js");
const types_js_1 = require("../gtm/types.js");
exports.gtmRouter = (0, express_1.Router)();
const service = new gtm_messaging_service_js_1.GtmMessagingService();
function asyncHandler(fn) {
    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        }
        catch (error) {
            next(error);
        }
    };
}
exports.gtmRouter.get('/icp', asyncHandler(async (_req, res) => {
    res.json(await service.getIcpBrief());
}));
exports.gtmRouter.get('/message-house', asyncHandler(async (_req, res) => {
    res.json(await service.getMessageHouse());
}));
exports.gtmRouter.post('/claims', asyncHandler(async (req, res) => {
    const parsed = types_js_1.ClaimInputSchema.parse(req.body);
    const result = await service.submitClaim(parsed);
    res.status(201).json(result);
}));
exports.gtmRouter.post('/claims/:claimId/approve', asyncHandler(async (req, res) => {
    const { claimId } = req.params;
    const { approver, notes } = req.body;
    if (!approver) {
        return res.status(400).json({ error: 'approver is required' });
    }
    const claim = await service.recordApproval(claimId, approver, notes);
    res.json(claim);
}));
exports.gtmRouter.post('/claims/expire', asyncHandler(async (_req, res) => {
    const expired = await service.expireClaims();
    res.json({ expired });
}));
exports.gtmRouter.get('/claims/channel/:channel', asyncHandler(async (req, res) => {
    res.json(await service.listClaimsForChannel(req.params.channel));
}));
exports.gtmRouter.get('/templates', asyncHandler(async (_req, res) => {
    res.json({ templates: service.getContentTemplates() });
}));
exports.gtmRouter.get('/website-kpis', asyncHandler(async (_req, res) => {
    res.json({ kpis: service.getWebsiteKpis() });
}));
exports.gtmRouter.get('/nurture-tracks', asyncHandler(async (_req, res) => {
    res.json({ nurture: service.getNurtureTracks() });
}));
exports.gtmRouter.get('/enablement', asyncHandler(async (_req, res) => {
    res.json({ assets: service.getEnablementAssets() });
}));
exports.gtmRouter.get('/channels', asyncHandler(async (_req, res) => {
    res.json({ playbooks: service.getChannelPlaybooks() });
}));
exports.gtmRouter.get('/checklist', asyncHandler(async (_req, res) => {
    const claims = await service.listClaimsForChannel('web');
    res.json({ checklist: service.buildExecutionChecklist(claims) });
}));
exports.gtmRouter.get('/evidence-graph', asyncHandler(async (_req, res) => {
    const claims = await service.listClaimsForChannel('web');
    res.json({ graph: service.buildEvidenceGraph(claims) });
}));
exports.gtmRouter.post('/routing', asyncHandler(async (req, res) => {
    const { behavioralScore, firmographic, intentLevel } = req.body;
    if (behavioralScore === undefined || !firmographic || !intentLevel) {
        return res.status(400).json({ error: 'behavioralScore, firmographic, and intentLevel are required' });
    }
    res.json({ route: service.decideAdaptiveRoute({ behavioralScore, firmographic, intentLevel }) });
}));
exports.gtmRouter.post('/qa/scan', asyncHandler(async (req, res) => {
    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'content is required' });
    }
    res.json(await service.closedLoopQa(content));
}));
exports.default = exports.gtmRouter;
